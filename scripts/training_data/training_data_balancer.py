"""
Training data balancer - Deletes excess images and generates missing ones.
"""

import logging
from pathlib import Path
from typing import Dict, Any, List
import os

from training_data_manifest import TrainingDataManifest

# Import with proper module path to avoid relative import issues
import sys
from pathlib import Path
src_path = Path(__file__).parent.parent.parent / "src"
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

from actor_training_prompts import get_actor_training_prompts, get_actor_descriptor

logger = logging.getLogger(__name__)


class TrainingDataBalancer:
    """Balances actor training data by deleting excess and generating missing images."""
    
    def __init__(self):
        """Initialize balancer."""
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
            
            # Delete from S3
            try:
                self._delete_from_s3(s3_url)
                deleted_count += 1
            except Exception as e:
                logger.error(f"Failed to delete from S3: {e}")
            
            # Remove from manifest
            if filename in manifest.manifest["images"]:
                del manifest.manifest["images"][filename]
        
        # Update manifest
        manifest.manifest["total_images"] = len(manifest.manifest["images"])
        manifest.save()
        
        logger.info(f"Deleted {deleted_count} images")
        return deleted_count
    
    def _generate_missing_images(self, actor_id: str, evaluation: Dict[str, Any]) -> int:
        """
        Generate missing training images.
        
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
        
        # For now, log what needs to be generated but don't actually generate
        # This avoids the complex import issues with ActorTrainingDataGenerator
        logger.warning("⚠️  Image generation not yet implemented in balancer")
        logger.warning("   This requires manual generation or integration with training pipeline")
        
        for generate_item in images_to_generate:
            img_type = generate_item["type"]
            count = generate_item["count"]
            logger.info(f"   TODO: Generate {count} {img_type} images for {actor_id}")
        
        return 0
    
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
        # Default to "human"
        # Could be enhanced to detect creatures, robots, etc. from metadata
        return "human"
