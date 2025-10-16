"""
Actor training data generator using Replicate flux-kontext-pro.
Generates 12 diverse training images from a single portrait using cinematic prompts.
"""

import os
import logging
import json
import base64
from typing import List, Dict, Any, Optional
from pathlib import Path
from io import BytesIO
from PIL import Image
from datetime import datetime
import openai

from .replicate_service import ReplicateService
from .actor_training_prompts import get_actor_training_prompts, get_actor_descriptor
from .utils.s3 import upload_image_to_s3
from .training_data_manifest import TrainingDataManifest

logger = logging.getLogger(__name__)


class ActorTrainingDataGenerator:
    """Generates training data for actor LoRA models from a single portrait."""
    
    def __init__(
        self,
        replicate_token: Optional[str] = None,
        debug_dir: Optional[str] = None,
        batch_size: int = 5
    ):
        """
        Initialize the actor training data generator.
        
        Args:
            replicate_token: Replicate API token (defaults to env var)
            debug_dir: Directory for saving debug files (optional)
            batch_size: Number of images to generate in parallel (default: 5)
        """
        self.replicate = ReplicateService(api_token=replicate_token)
        self.batch_size = batch_size
        
        # Debug directory
        self.debug_dir = Path(debug_dir) if debug_dir else Path("debug/actor_training_data")
        self.debug_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info("ActorTrainingDataGenerator initialized")
    
    def generate_training_data(
        self,
        portrait_url: str,
        user_id: str,
        actor_id: str,
        actor_type: str = "human",
        actor_sex: Optional[str] = None,
        portrait_buffer: Optional[bytes] = None
    ) -> Dict[str, Any]:
        """
        Generate training data from a single portrait image.
        
        Args:
            portrait_url: URL of the portrait image
            user_id: User ID for S3 uploads
            actor_id: Actor ID for organizing files
            actor_type: Type of actor ("human", "creature", "robotic", "anthropomorphic", "mythical")
            actor_sex: Sex of actor ("male", "female", or None)
            portrait_buffer: Optional pre-loaded portrait buffer to avoid re-downloading
            
        Returns:
            Dictionary with training_image_urls and total_training_images
        """
        logger.info(f"Starting actor training data generation for actor {actor_id}")
        logger.info(f"Actor type: {actor_type}, sex: {actor_sex}")
        
        # Get descriptor for prompts
        descriptor = get_actor_descriptor(actor_type, actor_sex)
        logger.info(f"Using descriptor: '{descriptor}'")
        
        # Get all training prompts
        all_prompts = get_actor_training_prompts(descriptor)
        logger.info(f"Generated {len(all_prompts)} training prompts")
        
        # Prepare portrait image
        portrait_base64 = self._prepare_portrait_image(portrait_url, portrait_buffer)
        
        # Generate images in batches
        generated_urls = []
        image_metadata = {}  # Track metadata for manifest
        total_prompts = len(all_prompts)
        
        for start_idx in range(0, total_prompts, self.batch_size):
            batch_indices = list(range(start_idx, min(start_idx + self.batch_size, total_prompts)))
            batch_num = (start_idx // self.batch_size) + 1
            total_batches = (total_prompts + self.batch_size - 1) // self.batch_size
            
            logger.info(f"Processing batch {batch_num}/{total_batches} ({len(batch_indices)} images)")
            
            # Process batch sequentially (Replicate API limits)
            for idx in batch_indices:
                prompt = all_prompts[idx]
                image_num = idx + 1
                
                try:
                    logger.info(f"Generating image {image_num}/{total_prompts}")
                    
                    # Generate image with flux-kontext-pro
                    generated_url = self._generate_training_image(
                        prompt=prompt,
                        portrait_base64=portrait_base64,
                        image_num=image_num
                    )
                    
                    # Upload to S3
                    s3_url = self._upload_training_image(
                        image_url=generated_url,
                        user_id=user_id,
                        actor_id=actor_id,
                        image_num=image_num
                    )
                    
                    # Store metadata
                    filename = f"actor_{actor_id}_td_{image_num:02d}.jpg"
                    image_metadata[filename] = {
                        "prompt": prompt,
                        "prompt_preview": prompt[:100] + "..." if len(prompt) > 100 else prompt,
                        "generated_at": datetime.now().isoformat(),
                        "s3_url": s3_url,
                        "index": image_num
                    }
                    
                    generated_urls.append(s3_url)
                    logger.info(f"Image {image_num}/{total_prompts} completed: {s3_url}")
                    
                except Exception as e:
                    logger.error(f"Failed to generate image {image_num}: {e}")
                    # Continue with next image
        
        logger.info(f"Training data generation complete: {len(generated_urls)}/{total_prompts} images generated")
        
        # Save to centralized manifest
        manifest_path = None
        if len(image_metadata) > 0:
            manifest = TrainingDataManifest(actor_id)
            manifest.add_generation(
                images=image_metadata,
                generation_type="replicate_flux_kontext",
                metadata={
                    "actor_type": actor_type,
                    "actor_sex": actor_sex,
                    "portrait_url": portrait_url,
                    "total_prompts": total_prompts
                }
            )
            manifest.save()
            manifest_path = str(manifest.manifest_file)
            
            # Also save debug manifest
            self._save_training_manifest(actor_id, image_metadata)
        
        # Create debug grid if in debug mode
        if len(generated_urls) > 0:
            self._create_debug_grid(generated_urls)
        
        return {
            "training_image_urls": generated_urls,
            "total_training_images": len(generated_urls),
            "target_training_images": total_prompts,
            "manifest_path": manifest_path
        }
    
    def _prepare_portrait_image(
        self,
        portrait_url: str,
        portrait_buffer: Optional[bytes] = None
    ) -> str:
        """
        Prepare portrait image as base64 JPEG.
        
        Args:
            portrait_url: URL of the portrait
            portrait_buffer: Optional pre-loaded buffer
            
        Returns:
            Base64-encoded JPEG image
        """
        logger.info("Preparing portrait image")
        
        # Get image buffer
        if portrait_buffer:
            logger.info("Using provided portrait buffer")
            image_buffer = portrait_buffer
        else:
            logger.info(f"Downloading portrait from: {portrait_url}")
            image_buffer = self.replicate.download_image_as_bytes(portrait_url)
        
        # Normalize to JPEG using PIL
        try:
            image = Image.open(BytesIO(image_buffer))
            
            # Convert to RGB if needed (handles RGBA, grayscale, etc.)
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Save as JPEG
            output = BytesIO()
            image.save(output, format='JPEG', quality=95)
            jpeg_buffer = output.getvalue()
            
            portrait_base64 = base64.b64encode(jpeg_buffer).decode('utf-8')
            logger.info(f"Portrait normalized to JPEG: {len(portrait_base64)} bytes (base64)")
            
            return portrait_base64
            
        except Exception as e:
            logger.error(f"Failed to normalize portrait image: {e}")
            # Fallback to original buffer
            portrait_base64 = base64.b64encode(image_buffer).decode('utf-8')
            logger.warning("Using original buffer without normalization")
            return portrait_base64
    
    def _generate_training_image(
        self,
        prompt: str,
        portrait_base64: str,
        image_num: int
    ) -> str:
        """
        Generate a single training image using flux-kontext-pro.
        
        Args:
            prompt: Text prompt for the image
            portrait_base64: Base64-encoded portrait image
            image_num: Image number for debugging
            
        Returns:
            URL of the generated image
        """
        # Save request payload for debugging
        if self.debug_dir:
            request_data = {
                "prompt": prompt,
                "image_num": image_num,
                "input_image": "<base64-data-truncated>",
                "aspect_ratio": "16:9",
                "output_format": "jpg",
                "safety_tolerance": 6,
            }
            request_file = self.debug_dir / f"request_payload_{image_num}.json"
            import json
            request_file.write_text(json.dumps(request_data, indent=2))
        
        # Generate image
        generated_url = self.replicate.generate_grid_with_flux_kontext(
            prompt=prompt,
            input_image_base64=portrait_base64,
            aspect_ratio="16:9",  # Cinematic aspect ratio for actors
            output_format="jpg"
        )
        
        # Save debug image
        if self.debug_dir:
            try:
                image_bytes = self.replicate.download_image_as_bytes(generated_url)
                debug_file = self.debug_dir / f"training_data_output_{image_num}.jpg"
                debug_file.write_bytes(image_bytes)
                logger.info(f"Saved debug image: {debug_file.name}")
            except Exception as e:
                logger.error(f"Failed to save debug image: {e}")
        
        return generated_url
    
    def _upload_training_image(
        self,
        image_url: str,
        user_id: str,
        actor_id: str,
        image_num: int
    ) -> str:
        """
        Download and upload training image to S3.
        
        Args:
            image_url: URL of the generated image
            user_id: User ID for S3 path
            actor_id: Actor ID for S3 path
            image_num: Image number for filename
            
        Returns:
            S3 URL of the uploaded image
        """
        logger.info(f"Downloading and uploading image {image_num} to S3")
        
        # Download image
        image_bytes = self.replicate.download_image_as_bytes(image_url)
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Upload to S3
        s3_url = upload_image_to_s3(
            image_base64=image_base64,
            user_id=user_id,
            folder=f"custom-actors/{actor_id}/training_data",
            filename=f"actor_{actor_id}_td_{image_num:02d}.jpg"
        )
        
        return s3_url
    
    def _create_debug_grid(self, image_urls: List[str]) -> None:
        """
        Create a grid of all generated images for quick inspection.
        
        Args:
            image_urls: List of S3 URLs of generated images
        """
        if not self.debug_dir:
            return
        
        try:
            logger.info("Creating debug grid of all training images")
            
            # Download all images
            images = []
            for idx, url in enumerate(image_urls):
                try:
                    # Try to load from debug folder first
                    debug_file = self.debug_dir / f"training_data_output_{idx + 1}.jpg"
                    if debug_file.exists():
                        img = Image.open(debug_file)
                    else:
                        # Download from URL
                        img_bytes = self.replicate.download_image_as_bytes(url)
                        img = Image.open(BytesIO(img_bytes))
                    images.append(img)
                except Exception as e:
                    logger.error(f"Failed to load image {idx + 1} for grid: {e}")
            
            if not images:
                logger.warning("No images available for grid creation")
                return
            
            # Create grid
            thumb_size = 512
            cols = 4  # 4 columns for 12 images = 3 rows
            rows = (len(images) + cols - 1) // cols
            grid_width = cols * thumb_size
            grid_height = rows * thumb_size
            
            # Create blank grid
            grid = Image.new('RGB', (grid_width, grid_height), color=(0, 0, 0))
            
            # Paste images
            for idx, img in enumerate(images):
                # Resize to thumbnail
                img_thumb = img.copy()
                img_thumb.thumbnail((thumb_size, thumb_size), Image.Resampling.LANCZOS)
                
                # Calculate position
                col = idx % cols
                row = idx // cols
                x = col * thumb_size
                y = row * thumb_size
                
                # Paste (centered if smaller than thumb_size)
                offset_x = (thumb_size - img_thumb.width) // 2
                offset_y = (thumb_size - img_thumb.height) // 2
                grid.paste(img_thumb, (x + offset_x, y + offset_y))
            
            # Save grid
            grid_file = self.debug_dir / "training_data_grid.jpg"
            grid.save(grid_file, format='JPEG', quality=90)
            logger.info(f"Saved debug grid: {grid_file}")
            
        except Exception as e:
            logger.error(f"Failed to create debug grid: {e}")
    
    def _save_training_manifest(self, actor_id: str, image_metadata: Dict[str, Any]) -> None:
        """
        Save training data manifest with prompts and metadata.
        
        Args:
            actor_id: Actor ID for filename
            image_metadata: Dictionary of image metadata
        """
        try:
            manifest = {
                "actor_id": actor_id,
                "generated_at": datetime.now().isoformat(),
                "total_images": len(image_metadata),
                "images": image_metadata
            }
            
            manifest_file = self.debug_dir / f"{actor_id}_prompt_metadata.json"
            manifest_file.write_text(json.dumps(manifest, indent=2))
            
            logger.info(f"Saved training data manifest: {manifest_file}")
            logger.info(f"Manifest contains {len(image_metadata)} images with prompts")
            
        except Exception as e:
            logger.error(f"Failed to save training manifest: {e}")
