"""
Training data balancer - Deletes excess images and generates missing ones.
"""

import logging
from pathlib import Path
from typing import Dict, Any, List
import os
import random

from training_data_manifest import TrainingDataManifest

# Import with proper module path to avoid relative import issues
import sys
from pathlib import Path
src_path = Path(__file__).parent.parent.parent / "src"
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

from actor_training_prompts import get_actor_training_prompts, get_actor_descriptor
from replicate_service import ReplicateService
from utils.s3 import upload_image_to_s3
import base64
from datetime import datetime

logger = logging.getLogger(__name__)


class TrainingDataBalancer:
    """Balances actor training data by deleting excess and generating missing images."""
    
    def __init__(self):
        """Initialize balancer."""
        self.replicate = ReplicateService()
        logger.info("TrainingDataBalancer initialized")
    
    def balance_actor(self, actor_id: str, evaluation: Dict[str, Any]) -> Dict[str, Any]:
        """
        Balance training data for an actor.
        
        Args:
            actor_id: Actor ID
            evaluation: Evaluation results from TrainingDataEvaluator
            
        Returns:
            Dictionary with balancing results
        """
        logger.info(f"Balancing training data for actor: {actor_id}")
        
        # Step 1: Delete excess images
        deleted_count = self._delete_excess_images(actor_id, evaluation)
        
        # Step 2: Generate missing images
        generated_count = self._generate_missing_images(actor_id, evaluation)
        
        return {
            "actor_id": actor_id,
            "deleted_count": deleted_count,
            "generated_count": generated_count
        }
    
    def _delete_excess_images(self, actor_id: str, evaluation: Dict[str, Any]) -> int:
        """
        Delete excess training images.
        
        Args:
            actor_id: Actor ID
            evaluation: Evaluation results
            
        Returns:
            Number of images deleted
        """
        images_to_delete = evaluation.get("images_to_delete", [])
        
        if not images_to_delete:
            logger.info("No images to delete")
            return 0
        
        logger.info(f"Deleting {len(images_to_delete)} excess images")
        
        # Load manifest
        manifest = TrainingDataManifest.load_actor_manifest(actor_id)
        all_images = manifest.get_all_images()
        
        # Convert to list for indexing (1-based from GPT)
        image_list = list(all_images.items())
        
        deleted_count = 0
        for delete_item in images_to_delete:
            img_number = delete_item["image_number"]
            img_type = delete_item["type"]
            
            # Convert to 0-based index
            idx = img_number - 1
            
            if idx < 0 or idx >= len(image_list):
                logger.warning(f"Invalid image number: {img_number}")
                continue
            
            filename, img_data = image_list[idx]
            s3_url = img_data.get("s3_url")
            
            logger.info(f"Deleting image {img_number} ({img_type}): {filename}")
            local_path = img_data.get("local_path")
            
            # Delete from S3
            try:
                if s3_url:
                    self._delete_from_s3(s3_url)
                    logger.info(f"  ✓ Deleted from S3: {s3_url}")
            except Exception as e:
                logger.error(f"Failed to delete from S3: {e}")
            
            # Delete local file
            try:
                if local_path and Path(local_path).exists():
                    Path(local_path).unlink()
                    logger.info(f"  ✓ Deleted local file: {local_path}")
                elif local_path:
                    logger.warning(f"  ⚠ Local file not found: {local_path}")
            except Exception as e:
                logger.error(f"Failed to delete local file: {e}")
            
            # Remove from manifest
            if filename in manifest.manifest["images"]:
                del manifest.manifest["images"][filename]
                deleted_count += 1
        
        # Update manifest
        manifest.manifest["total_images"] = len(manifest.manifest["images"])
        manifest.save()
        
        logger.info(f"Deleted {deleted_count} images")
        return deleted_count
    
    def _generate_missing_images(self, actor_id: str, evaluation: Dict[str, Any]) -> int:
        """
        Generate missing training images using Replicate.
        
        Args:
            actor_id: Actor ID
            evaluation: Evaluation results
            
        Returns:
            Number of images generated
        """
        images_to_generate = evaluation.get("images_to_generate", [])
        
        if not images_to_generate:
            logger.info("No images to generate")
            return 0
        
        total_to_generate = sum(item["count"] for item in images_to_generate)
        logger.info(f"Need to generate {total_to_generate} missing images")
        
        # Load manifest to get actor metadata and base image
        manifest_obj = TrainingDataManifest.load_actor_manifest(actor_id)
        manifest_dict = manifest_obj.manifest
        metadata = manifest_dict.get("metadata", {})
        
        # Get base image for generation
        base_image_path = self._get_base_image_path(actor_id, manifest_dict)
        if not base_image_path:
            logger.error(f"No base image found for actor {actor_id}")
            return 0
        
        logger.info(f"Using base image: {base_image_path}")
        
        # Prepare base image as base64
        base_image_base64 = self._prepare_base_image(base_image_path)
        if not base_image_base64:
            logger.error("Failed to prepare base image")
            return 0
        
        # Get actor descriptor for prompts
        actor_type = self._infer_actor_type(metadata)
        actor_sex = metadata.get("sex")
        descriptor = get_actor_descriptor(actor_type, actor_sex)
        logger.info(f"Using descriptor: '{descriptor}' (type: {actor_type}, sex: {actor_sex})")
        
        # Get all available prompts
        all_prompts = get_actor_training_prompts(descriptor)
        logger.info(f"Total available prompts: {len(all_prompts)}")
        
        # Categorize prompts by type
        # Based on actor_training_prompts.py structure:
        # 0-14: photorealistic (15 prompts)
        # 15-25: bw_stylized (11 prompts)
        # 26-34: color_stylized (9 prompts)
        prompt_categories = {
            "photorealistic": all_prompts[0:15],
            "bw_stylized": all_prompts[15:26],
            "color_stylized": all_prompts[26:35]
        }
        
        # Get current highest image number for sequential numbering
        current_images = manifest_dict.get("images", {})
        max_number = self._get_max_image_number(current_images)
        next_number = max_number + 1
        
        logger.info(f"Current max image number: {max_number}, starting at: {next_number}")
        
        # Generate images by type
        generated_count = 0
        new_images_metadata = {}
        
        for generate_item in images_to_generate:
            img_type = generate_item["type"]
            count = generate_item["count"]
            
            logger.info(f"\nGenerating {count} {img_type} images...")
            
            # Get prompts for this type
            type_prompts = prompt_categories.get(img_type, [])
            if not type_prompts:
                logger.error(f"No prompts available for type: {img_type}")
                continue
            
            # Randomly select prompts (without replacement)
            selected_prompts = random.sample(type_prompts, min(count, len(type_prompts)))
            
            # Generate each image
            for idx, prompt in enumerate(selected_prompts):
                try:
                    image_num = next_number + generated_count
                    logger.info(f"  Generating image {image_num} ({idx + 1}/{count})...")
                    
                    # Generate image with flux-kontext-pro
                    generated_url = self.replicate.generate_grid_with_flux_kontext(
                        prompt=prompt,
                        input_image_base64=base_image_base64,
                        aspect_ratio="16:9",
                        output_format="jpg"
                    )
                    
                    # Download image
                    image_bytes = self.replicate.download_image_as_bytes(generated_url)
                    image_base64 = base64.b64encode(image_bytes).decode('utf-8')
                    
                    # Upload to S3 (use story-boards-assets bucket to match existing training data)
                    filename = f"{actor_id}_{image_num}.jpg"
                    
                    s3_url = upload_image_to_s3(
                        image_base64=image_base64,
                        user_id="system_actors",
                        folder=f"training_data/{actor_id}",
                        filename=filename,
                        bucket="story-boards-assets"
                    )
                    
                    # Save local copy
                    local_path = Path(f"data/actors/{actor_id}/training_data/{filename}")
                    local_path.parent.mkdir(parents=True, exist_ok=True)
                    local_path.write_bytes(image_bytes)
                    
                    # Store metadata
                    new_images_metadata[filename] = {
                        "prompt": prompt,
                        "prompt_preview": prompt[:100] + "..." if len(prompt) > 100 else prompt,
                        "generated_at": datetime.now().isoformat(),
                        "s3_url": s3_url,
                        "local_path": str(local_path),
                        "index": image_num,
                        "type": img_type,
                        "generated_by": "balancer"
                    }
                    
                    generated_count += 1
                    logger.info(f"  ✓ Generated and uploaded: {filename}")
                    logger.info(f"    S3: {s3_url}")
                    logger.info(f"    Local: {local_path}")
                    
                except Exception as e:
                    logger.error(f"  ✗ Failed to generate image {image_num}: {e}")
                    continue
        
        # Update manifest with new images
        if new_images_metadata:
            manifest = TrainingDataManifest.load_actor_manifest(actor_id)
            manifest.add_generation(
                images=new_images_metadata,
                generation_type="balancer_replicate",
                metadata={
                    "actor_type": actor_type,
                    "actor_sex": actor_sex,
                    "balancer_run": datetime.now().isoformat()
                }
            )
            manifest.save()
            logger.info(f"\n✓ Updated manifest with {generated_count} new images")
        
        logger.info(f"\n✓ Generation complete: {generated_count}/{total_to_generate} images generated")
        return generated_count
    
    def _delete_from_s3(self, s3_url: str) -> None:
        """
        Delete an image from S3.
        
        Args:
            s3_url: S3 URL to delete
        """
        import boto3
        from urllib.parse import urlparse
        
        # Parse S3 URL
        parsed = urlparse(s3_url)
        bucket = parsed.netloc.split('.')[0]
        key = parsed.path.lstrip('/')
        
        # Delete from S3
        s3_client = boto3.client('s3')
        s3_client.delete_object(Bucket=bucket, Key=key)
        
        logger.debug(f"Deleted from S3: s3://{bucket}/{key}")
    
    def _infer_actor_type(self, metadata: Dict[str, Any]) -> str:
        """
        Infer actor type from metadata.
        
        Args:
            metadata: Actor metadata
            
        Returns:
            Actor type string
        """
        # Check for explicit actor_type field
        actor_type = metadata.get("actor_type", "human")
        
        # Fallback to ethnicity-based inference (all current actors are human)
        if actor_type == "human" or not actor_type:
            return "human"
        
        return actor_type
    
    def _get_base_image_path(self, actor_id: str, manifest: Dict[str, Any]) -> str:
        """
        Get the base image path for an actor.
        
        Args:
            actor_id: Actor ID
            manifest: Actor manifest
            
        Returns:
            Path to base image or None
        """
        # Try to get from base_images array
        base_images = manifest.get("base_images", [])
        if base_images and len(base_images) > 0:
            # Use moved_to path if available, otherwise relative_path
            base_img = base_images[0]
            moved_path = base_img.get("moved_to")
            if moved_path and Path(moved_path).exists():
                return moved_path
            
            relative_path = base_img.get("moved_relative_path") or base_img.get("relative_path")
            if relative_path:
                full_path = Path(relative_path)
                if full_path.exists():
                    return str(full_path)
        
        # Fallback: look for base_image directory
        base_image_dir = Path(f"data/actors/{actor_id}/base_image")
        if base_image_dir.exists():
            # Find first image file
            for ext in ["*.png", "*.jpg", "*.jpeg", "*.webp"]:
                files = list(base_image_dir.glob(ext))
                if files:
                    return str(files[0])
        
        logger.error(f"No base image found for actor {actor_id}")
        return None
    
    def _prepare_base_image(self, image_path: str) -> str:
        """
        Prepare base image as base64 JPEG.
        
        Args:
            image_path: Path to base image
            
        Returns:
            Base64-encoded JPEG image or None
        """
        try:
            from PIL import Image
            from io import BytesIO
            
            # Load and normalize to JPEG
            image = Image.open(image_path)
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Save as JPEG
            output = BytesIO()
            image.save(output, format='JPEG', quality=95)
            jpeg_buffer = output.getvalue()
            
            base64_str = base64.b64encode(jpeg_buffer).decode('utf-8')
            logger.info(f"Base image prepared: {len(base64_str)} bytes (base64)")
            
            return base64_str
            
        except Exception as e:
            logger.error(f"Failed to prepare base image: {e}")
            return None
    
    def _get_max_image_number(self, images: Dict[str, Any]) -> int:
        """
        Get the maximum image number from existing images.
        
        Args:
            images: Dictionary of images from manifest
            
        Returns:
            Maximum image number found
        """
        max_num = 0
        
        for filename in images.keys():
            # Extract number from filename patterns like:
            # 0001_european_20_female_12.png
            # actor_0001_td_05.jpg
            # 0001_15.jpg
            import re
            
            # Try to find numbers in filename
            numbers = re.findall(r'_(\d+)\.', filename)
            if numbers:
                # Get the last number (usually the image number)
                num = int(numbers[-1])
                max_num = max(max_num, num)
        
        return max_num
