"""
Poster frame generation service for custom actors.
Based on generatePosterFrameComfyUi.ts from the backend.
"""
import time
import logging
import requests
import json
from typing import Dict, Any, Optional
from pathlib import Path

from workflows_lib.poster_frame_workflow import (
    get_poster_frame_workflow,
    POSTER_FRAME_PROMPT_TEMPLATE
)
from runpod.serverless import RunPodServerlessClient
from utils.s3 import S3Client, S3Config

logger = logging.getLogger(__name__)


class PosterFrameGenerator:
    """Service for generating poster frames for custom actors."""
    
    def __init__(
        self,
        runpod_api_key: Optional[str] = None,
        s3_client: Optional[S3Client] = None,
        s3_bucket: Optional[str] = None
    ):
        """
        Initialize the poster frame generator.
        
        Args:
            runpod_api_key: RunPod API key (uses env var if not provided)
            s3_client: S3Client instance (creates new one if not provided)
            s3_bucket: S3 bucket name (uses AWS_USER_IMAGES_BUCKET env var if not provided)
        """
        self.runpod_client = RunPodServerlessClient(api_key=runpod_api_key)
        self.s3_client = s3_client or S3Client()
        self.s3_bucket = s3_bucket or S3Config.AWS_USER_IMAGES_BUCKET
        
        if not self.s3_bucket:
            raise ValueError("S3 bucket is required. Set AWS_USER_IMAGES_BUCKET environment variable.")
    
    def generate_poster_frame(
        self,
        actor_id: str,
        character_lora_name: str,
        custom_actor_description: str,
        user_id: Optional[str] = None,
        character_lora_url: Optional[str] = None,
        style_lora_name: str = "SBai_style_101",
        style_lora_strength: float = 1.0,
        character_lora_strength: float = 0.7,
        width: int = 1024,
        height: int = 1024,
        steps: int = 22,
        seed: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generate a poster frame for a custom actor.
        
        Args:
            actor_id: Actor ID for S3 path and tracking
            character_lora_name: The LoRA name of the custom actor
            custom_actor_description: Description of the actor
            user_id: User ID for S3 path (optional)
            style_lora_name: Style LoRA name (default: SBai_style_101)
            style_lora_strength: Style LoRA strength (default: 1.0)
            character_lora_strength: Character LoRA strength (default: 0.7)
            width: Image width (default: 1024)
            height: Image height (default: 1024)
            steps: Number of sampling steps (default: 22)
            seed: Random seed (None for random)
        
        Returns:
            Dict with 'thumbnail_image_url' key containing the S3 URL
        """
        request_id = f"poster_{int(time.time())}_{actor_id[:8]}"
        logger.info(f"[{request_id}] Starting poster frame generation for actor {actor_id}")
        
        # Build positive prompt from template
        positive_prompt = POSTER_FRAME_PROMPT_TEMPLATE.replace(
            "{character_id}", character_lora_name
        ).replace(
            "{customActorDescription}", custom_actor_description
        )
        
        logger.debug(f"[{request_id}] Positive prompt: {positive_prompt[:100]}...")
        
        # Build workflow
        workflow = get_poster_frame_workflow(
            positive_prompt=positive_prompt,
            width=width,
            height=height,
            steps=steps,
            seed=seed,
            style_lora_name=style_lora_name,
            style_lora_strength=style_lora_strength,
            character_loras=[character_lora_name],
            character_lora_strength=character_lora_strength
        )
        
        # Build model_urls array for LoRA downloads
        model_urls = []
        
        # Add character LoRA if URL provided
        if character_lora_url:
            character_lora_id = character_lora_name if character_lora_name.endswith('.safetensors') else f"{character_lora_name}.safetensors"
            model_urls.append({
                "id": character_lora_id,
                "url": character_lora_url
            })
            logger.debug(f"[{request_id}] Added character LoRA: {character_lora_id}")
        
        # Add style LoRA (system LoRA from story-boards-assets bucket)
        if style_lora_name:
            style_lora_id = style_lora_name if style_lora_name.endswith('.safetensors') else f"{style_lora_name}.safetensors"
            style_lora_url = f"https://story-boards-assets.s3-accelerate.amazonaws.com/styles/{style_lora_id}"
            model_urls.append({
                "id": style_lora_id,
                "url": style_lora_url
            })
            logger.debug(f"[{request_id}] Added style LoRA: {style_lora_id}")
        
        # Prepare payload for RunPod with model_urls
        payload = {
            "input": {
                "workflow": workflow,
                "model_urls": model_urls,
                "force_download": False
            }
        }
        
        logger.info(f"[{request_id}] Payload includes {len(model_urls)} model URLs")
        
        # Save request to debug folder
        debug_dir = Path(__file__).parent.parent / "debug"
        debug_dir.mkdir(exist_ok=True)
        
        request_debug_file = debug_dir / "poster_frame_request.json"
        with open(request_debug_file, 'w') as f:
            json.dump(payload, f, indent=2)
        logger.info(f"[{request_id}] Saved request to {request_debug_file}")
        
        try:
            # Send request to RunPod serverless
            # Get the endpoint ID from config
            from runpod.config import RunPodConfig
            endpoint_id = RunPodConfig.get_serverless_endpoint("wizard")
            logger.info(f"[{request_id}] Sending poster frame generation request to RunPod endpoint: {endpoint_id}")
            
            result = self.runpod_client.generate_image(
                payload=payload,
                mode="wizard",  # Use wizard mode for poster frames
                request_id=request_id
            )
            
            # Save response to debug folder
            response_debug_file = debug_dir / "poster_frame_response.json"
            with open(response_debug_file, 'w') as f:
                # Create a safe copy without full base64 strings
                safe_result = self._sanitize_for_debug(result)
                json.dump(safe_result, f, indent=2)
            logger.info(f"[{request_id}] Saved response to {response_debug_file}")
            
            if not result:
                raise Exception("RunPod request returned None")
            
            # Check for successful completion
            if result.get("status") != "COMPLETED":
                error_msg = result.get("output", {}).get("error", "Unknown error")
                raise Exception(f"Poster frame generation failed: {error_msg}")
            
            # Extract image from result
            # Try multiple possible locations for images array
            images = None
            output = result.get("output", {})
            
            # Log output structure (without full base64)
            logger.debug(f"[{request_id}] Output keys: {list(output.keys())}")
            
            # Try different possible locations
            if "job_results" in output and "images" in output["job_results"]:
                images = output["job_results"]["images"]
                logger.debug(f"[{request_id}] Found images in output.job_results.images")
            elif "output" in output and "images" in output["output"]:
                images = output["output"]["images"]
                logger.debug(f"[{request_id}] Found images in output.output.images")
            elif "images" in output:
                images = output["images"]
                logger.debug(f"[{request_id}] Found images in output.images")
            
            if not images or len(images) == 0:
                # Log available keys for debugging
                logger.error(f"[{request_id}] No images found. Available output keys: {list(output.keys())}")
                if "output" in output:
                    logger.error(f"[{request_id}] output.output keys: {list(output.get('output', {}).keys())}")
                raise Exception("No images in RunPod output")
            
            image_data = images[0]
            logger.info(f"[{request_id}] Found image data (type: {type(image_data).__name__})")
            
            # Handle both URL and base64 formats
            if isinstance(image_data, str):
                if image_data.startswith('data:image'):
                    # Base64 encoded image
                    logger.info(f"[{request_id}] Processing base64 image")
                    import base64
                    # Extract base64 data after comma
                    base64_data = image_data.split(',', 1)[1] if ',' in image_data else image_data
                    image_bytes = base64.b64decode(base64_data)
                    logger.info(f"[{request_id}] Decoded base64 image ({len(image_bytes)} bytes)")
                elif image_data.startswith('http'):
                    # URL - download it
                    logger.info(f"[{request_id}] Downloading image from URL")
                    response = requests.get(image_data, timeout=60)
                    response.raise_for_status()
                    image_bytes = response.content
                    logger.info(f"[{request_id}] Downloaded image ({len(image_bytes)} bytes)")
                else:
                    # Assume raw base64
                    logger.info(f"[{request_id}] Processing raw base64")
                    import base64
                    image_bytes = base64.b64decode(image_data)
                    logger.info(f"[{request_id}] Decoded raw base64 ({len(image_bytes)} bytes)")
            else:
                raise Exception(f"Unexpected image data type: {type(image_data)}")
            
            # Upload to S3
            s3_key = self._build_s3_key(actor_id, user_id)
            logger.info(f"[{request_id}] Uploading poster frame to S3: {s3_key}")
            
            upload_result = self.s3_client.upload_file(
                file_data=image_bytes,
                bucket=self.s3_bucket,
                key=s3_key,
                content_type="image/jpeg"
            )
            
            s3_url = upload_result['Location']
            logger.info(f"[{request_id}] ✅ Successfully generated and uploaded poster frame to {s3_url}")
            
            return {
                "thumbnail_image_url": s3_url
            }
            
        except Exception as e:
            logger.error(f"[{request_id}] ❌ Error generating poster frame: {str(e)}")
            raise
    
    def _sanitize_for_debug(self, data: Any) -> Any:
        """
        Sanitize data for debug output by truncating base64 strings.
        
        Args:
            data: Data to sanitize
        
        Returns:
            Sanitized copy of data
        """
        import copy
        
        if data is None:
            return None
        
        # Make a deep copy to avoid modifying original
        safe_data = copy.deepcopy(data)
        
        def truncate_base64(obj):
            """Recursively truncate base64 strings in nested structures."""
            if isinstance(obj, dict):
                for key, value in obj.items():
                    if isinstance(value, str):
                        # Check if it's a base64 string (long string or data URI)
                        if len(value) > 100 and ('base64' in value or value.startswith('/9j/')):
                            obj[key] = f"<base64_data_{len(value)}_bytes>"
                        elif value.startswith('data:image'):
                            obj[key] = f"<data_uri_{len(value)}_bytes>"
                    elif isinstance(value, (dict, list)):
                        truncate_base64(value)
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    if isinstance(item, str):
                        if len(item) > 100 and ('base64' in item or item.startswith('/9j/')):
                            obj[i] = f"<base64_data_{len(item)}_bytes>"
                        elif item.startswith('data:image'):
                            obj[i] = f"<data_uri_{len(item)}_bytes>"
                    elif isinstance(item, (dict, list)):
                        truncate_base64(item)
        
        truncate_base64(safe_data)
        return safe_data
    
    def _build_s3_key(self, actor_id: str, user_id: Optional[str] = None) -> str:
        """
        Build S3 key for poster frame storage.
        
        Args:
            actor_id: Actor ID
            user_id: User ID (optional)
        
        Returns:
            S3 key path
        """
        import uuid
        timestamp = int(time.time())
        unique_id = str(uuid.uuid4())[:8]
        
        if user_id:
            # User-specific path: characters/{user_id}/{actor_id}/poster_frames/poster_{uuid}.jpeg
            return f"characters/{user_id}/{actor_id}/poster_frames/poster_{unique_id}.jpeg"
        else:
            # Generic path: actors/{actor_id}/poster_frames/poster_{timestamp}_{uuid}.jpeg
            return f"actors/{actor_id}/poster_frames/poster_{timestamp}_{unique_id}.jpeg"


# Convenience function
def generate_poster_frame(
    actor_id: str,
    character_lora_name: str,
    custom_actor_description: str,
    user_id: Optional[str] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Generate a poster frame for a custom actor.
    
    Args:
        actor_id: Actor ID for S3 path and tracking
        character_lora_name: The LoRA name of the custom actor
        custom_actor_description: Description of the actor
        user_id: User ID for S3 path (optional)
        **kwargs: Additional parameters for generation
    
    Returns:
        Dict with 'thumbnail_image_url' key containing the S3 URL
    """
    generator = PosterFrameGenerator()
    return generator.generate_poster_frame(
        actor_id=actor_id,
        character_lora_name=character_lora_name,
        custom_actor_description=custom_actor_description,
        user_id=user_id,
        **kwargs
    )
