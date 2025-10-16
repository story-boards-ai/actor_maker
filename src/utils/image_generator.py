"""
Image generation using RunPod serverless and FLUX workflows.
Generates images with styles and saves them to the style's resources folder.
"""
import os
import base64
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime
import uuid

try:
    from ..runpod.serverless import RunPodServerlessClient
    from ..runpod.config import RunPodConfig
    from ..workflows_lib.workflow_builder import WorkflowBuilder
    from ..styles.styles_registry import StylesRegistry
except ImportError:
    from runpod.serverless import RunPodServerlessClient
    from runpod.config import RunPodConfig
    from workflows_lib.workflow_builder import WorkflowBuilder
    from styles.styles_registry import StylesRegistry

logger = logging.getLogger(__name__)


class ImageGenerator:
    """Generate images using RunPod serverless with FLUX workflows."""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        workflow_path: Optional[str] = None
    ):
        """
        Initialize the image generator.
        
        Args:
            api_key: RunPod API key (uses RUNPOD_API_KEY env var if not provided)
            workflow_path: Path to workflow JSON (uses default V4 workflow if not provided)
        """
        # Validate config
        RunPodConfig.validate()
        
        # Initialize clients
        self.serverless_client = RunPodServerlessClient(api_key=api_key)
        self.workflow_builder = WorkflowBuilder(workflow_path=workflow_path)
        self.styles_registry = StylesRegistry()
        
        # Get project root for saving images
        self.project_root = Path(__file__).parent.parent.parent
        self.resources_dir = self.project_root / "resources" / "style_images"
        
        logger.info("ImageGenerator initialized successfully")
    
    def generate_image(
        self,
        prompt: str,
        style_id: Optional[str] = None,
        width: int = 1360,
        height: int = 768,
        steps: int = 20,
        seed: int = -1,
        character_loras: Optional[List[str]] = None,
        save_to_style: bool = True,
        filename: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Generate an image with the specified parameters.
        
        Args:
            prompt: Text prompt for generation
            style_id: Style ID to use (from styles registry)
            width: Image width (default: 1360)
            height: Image height (default: 768)
            steps: Number of sampling steps (default: 20)
            seed: Random seed (-1 for random)
            character_loras: List of character LoRA names/IDs
            save_to_style: Save image to style's resources folder (default: True)
            filename: Custom filename (default: auto-generated with timestamp)
        
        Returns:
            Dict with image data and metadata, or None on failure
        """
        request_id = f"img_{uuid.uuid4().hex[:8]}"
        logger.info(
            f"[{request_id}] Starting image generation | "
            f"style_id={style_id or 'none'} | prompt_len={len(prompt)}"
        )
        
        # Get style configuration if provided
        style_config = None
        if style_id:
            style_config = self.styles_registry.get_style_by_id(style_id)
            if not style_config:
                logger.error(f"Style not found: {style_id}")
                return None
            logger.info(
                f"[{request_id}] Using style: {style_config.get('title')} "
                f"(LoRA: {style_config.get('lora_name')})"
            )
        
        # Build workflow
        workflow_params = {
            "positive_prompt": prompt,
            "width": width,
            "height": height,
            "steps": steps,
            "seed": seed,
        }
        
        # Add style parameters if available
        if style_config:
            workflow_params.update({
                "model": style_config.get("model", "flux1-dev-fp8"),
                "lora_name": style_config.get("lora_name"),
                "lora_strength": style_config.get("lora_weight", 1.0),
                "character_lora_strength": style_config.get("character_lora_weight", 0.85),
                "cine_lora_strength": style_config.get("cine_lora_weight", 0.0),
                "flux_guidance": style_config.get("flux_guidance", 3.5),
            })
        
        if character_loras:
            workflow_params["character_loras"] = character_loras
        
        workflow = self.workflow_builder.build_workflow(**workflow_params)
        
        # Build payload
        payload = {
            "input": {
                "workflow": workflow,
                "model_urls": [],  # Could add custom LoRA URLs here
                "force_download": False
            }
        }
        
        # Generate image using RUNPOD_SERVER_100_ID
        logger.info(f"[{request_id}] Sending request to RunPod serverless...")
        result = self.serverless_client.generate_image(
            payload=payload,
            mode="wizard",  # Uses RUNPOD_SERVER_100_ID
            request_id=request_id
        )
        
        if not result:
            logger.error(f"[{request_id}] Image generation failed - no result")
            return None
        
        # Check status
        status = result.get("status")
        if status != "COMPLETED":
            error = result.get("output", {}).get("error", "Unknown error")
            logger.error(f"[{request_id}] Generation failed: {error}")
            return None
        
        # Extract images from response (supports multiple formats)
        images = self._extract_images(result)
        if not images:
            logger.error(f"[{request_id}] No images in response")
            return None
        
        logger.info(f"[{request_id}] Successfully generated {len(images)} image(s)")
        
        # Save image if requested
        saved_path = None
        if save_to_style and style_id and style_config:
            saved_path = self._save_image_to_style(
                image_base64=images[0],
                style_config=style_config,
                filename=filename,
                request_id=request_id
            )
        
        return {
            "request_id": request_id,
            "status": "success",
            "images": images,
            "seed": workflow_params["seed"],
            "style_id": style_id,
            "saved_path": saved_path,
            "metadata": {
                "prompt": prompt,
                "width": width,
                "height": height,
                "steps": steps,
                "style_title": style_config.get("title") if style_config else None,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        }
    
    def _extract_images(self, result: Dict[str, Any]) -> List[str]:
        """
        Extract base64 images from RunPod response.
        Supports multiple response formats for backward compatibility.
        
        Args:
            result: RunPod response dict
        
        Returns:
            List of base64 image strings
        """
        output = result.get("output", {})
        
        # Try new format first: output.job_results.images
        if "job_results" in output and "images" in output["job_results"]:
            return output["job_results"]["images"]
        
        # Try legacy format: output.output.images
        if "output" in output and "images" in output["output"]:
            return output["output"]["images"]
        
        # Try middle format: output.images
        if "images" in output:
            return output["images"]
        
        # Try root level: images
        if "images" in result:
            return result["images"]
        
        return []
    
    def _save_image_to_style(
        self,
        image_base64: str,
        style_config: Dict[str, Any],
        filename: Optional[str],
        request_id: str
    ) -> Optional[str]:
        """
        Save generated image to style's resources folder.
        
        Args:
            image_base64: Base64 encoded image data
            style_config: Style configuration dict
            filename: Custom filename or None for auto-generated
            request_id: Request ID for logging
        
        Returns:
            Saved file path or None on failure
        """
        try:
            # Determine style folder
            style_id = style_config["id"]
            style_title = style_config["title"]
            
            # Create folder name (e.g., "1_ink_intensity")
            folder_name = f"{style_id}_{style_title.lower().replace(' ', '_')}"
            style_folder = self.resources_dir / folder_name
            style_folder.mkdir(parents=True, exist_ok=True)
            
            # Generate filename if not provided
            if not filename:
                timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
                filename = f"generated_{timestamp}_{request_id[:8]}.png"
            
            # Ensure .png extension
            if not filename.endswith('.png'):
                filename = f"{filename}.png"
            
            file_path = style_folder / filename
            
            # Decode and save image
            image_data = base64.b64decode(image_base64)
            with open(file_path, 'wb') as f:
                f.write(image_data)
            
            logger.info(
                f"[{request_id}] Saved image to: {file_path.relative_to(self.project_root)}"
            )
            
            return str(file_path)
            
        except Exception as e:
            logger.error(f"[{request_id}] Failed to save image: {e}")
            return None
    
    def generate_batch(
        self,
        prompts: List[str],
        style_id: Optional[str] = None,
        **kwargs
    ) -> List[Optional[Dict[str, Any]]]:
        """
        Generate multiple images with the same settings.
        
        Args:
            prompts: List of prompts to generate
            style_id: Style ID to use for all images
            **kwargs: Additional parameters for generate_image()
        
        Returns:
            List of result dicts (or None for failures)
        """
        results = []
        total = len(prompts)
        
        logger.info(f"Starting batch generation of {total} images")
        
        for i, prompt in enumerate(prompts, 1):
            logger.info(f"Generating image {i}/{total}")
            result = self.generate_image(
                prompt=prompt,
                style_id=style_id,
                **kwargs
            )
            results.append(result)
        
        successful = sum(1 for r in results if r is not None)
        logger.info(
            f"Batch generation complete: {successful}/{total} successful"
        )
        
        return results


# Convenience function
def generate_image_with_style(
    prompt: str,
    style_id: str,
    **kwargs
) -> Optional[Dict[str, Any]]:
    """
    Quick helper to generate an image with a style.
    
    Args:
        prompt: Text prompt
        style_id: Style ID from registry
        **kwargs: Additional parameters
    
    Returns:
        Result dict or None on failure
    """
    generator = ImageGenerator()
    return generator.generate_image(prompt=prompt, style_id=style_id, **kwargs)
