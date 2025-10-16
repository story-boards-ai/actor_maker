"""
Training data API for frontend integration.
Auto-initializes manifests when training data tab is opened.
"""

import logging
from typing import Dict, Any, Optional

from .training_data_sync import TrainingDataSync
from .training_data_manifest import TrainingDataManifest

logger = logging.getLogger(__name__)


class TrainingDataAPI:
    """API for training data management."""
    
    def __init__(self):
        """Initialize training data API."""
        self.sync = TrainingDataSync()
    
    def get_training_data(
        self,
        actor_id: str,
        bucket: str = "story-boards-assets",
        s3_prefix: Optional[str] = None,
        force_rescan: bool = False
    ) -> Dict[str, Any]:
        """
        Get training data for an actor.
        Auto-initializes manifest if it doesn't exist.
        
        This should be called when the training data tab is opened.
        
        Args:
            actor_id: Actor ID
            bucket: S3 bucket name
            s3_prefix: S3 prefix (defaults to system_actors/training_data/{actor_id})
            force_rescan: Force full S3 rescan
            
        Returns:
            Dictionary with training data and manifest info
        """
        logger.info(f"Getting training data for actor: {actor_id}")
        
        try:
            # Auto-initialize/sync manifest
            manifest = self.sync.auto_initialize_manifest(
                actor_id=actor_id,
                bucket=bucket,
                s3_prefix=s3_prefix,
                force_rescan=force_rescan
            )
            
            # Get all images
            images = manifest.get_all_images()
            stats = manifest.get_stats()
            
            # Format response
            response = {
                "actor_id": actor_id,
                "total_images": stats['total_images'],
                "total_generations": stats['total_generations'],
                "created_at": stats['created_at'],
                "updated_at": stats['updated_at'],
                "manifest_path": str(manifest.manifest_file),
                "images": [
                    {
                        "filename": filename,
                        "s3_url": data['s3_url'],
                        "s3_key": data.get('s3_key'),
                        "prompt": data.get('prompt', 'N/A'),
                        "prompt_preview": data.get('prompt_preview', 'N/A'),
                        "generated_at": data.get('generated_at'),
                        "last_modified": data.get('last_modified'),
                        "size": data.get('size'),
                        "index": data.get('index'),
                        "generation_id": data.get('generation_id'),
                        "generation_type": data.get('generation_type')
                    }
                    for filename, data in images.items()
                ],
                "generations": stats['generations']
            }
            
            logger.info(f"Returning {len(images)} training images for actor {actor_id}")
            return response
            
        except Exception as e:
            logger.error(f"Failed to get training data: {e}")
            raise
    
    def delete_training_image(
        self,
        actor_id: str,
        filename: str,
        delete_from_s3: bool = False
    ) -> Dict[str, Any]:
        """
        Delete a training image from manifest (and optionally from S3).
        
        Args:
            actor_id: Actor ID
            filename: Image filename
            delete_from_s3: Whether to also delete from S3
            
        Returns:
            Updated manifest info
        """
        logger.info(f"Deleting training image: {actor_id}/{filename}")
        
        manifest = TrainingDataManifest(actor_id)
        images = manifest.manifest['images']
        
        if filename not in images:
            raise ValueError(f"Image not found in manifest: {filename}")
        
        image_data = images[filename]
        
        # Delete from S3 if requested
        if delete_from_s3 and 's3_key' in image_data:
            try:
                bucket = image_data['s3_url'].split('.s3.')[0].split('://')[-1]
                self.sync.s3_client.delete_object(
                    Bucket=bucket,
                    Key=image_data['s3_key']
                )
                logger.info(f"Deleted from S3: {image_data['s3_key']}")
            except Exception as e:
                logger.error(f"Failed to delete from S3: {e}")
        
        # Remove from manifest
        del images[filename]
        manifest.manifest['total_images'] = len(images)
        manifest.manifest['updated_at'] = TrainingDataSync.__module__  # Use datetime
        manifest.save()
        
        logger.info(f"Deleted image from manifest: {filename}")
        
        return {
            "deleted": filename,
            "total_images": manifest.manifest['total_images']
        }
    
    def rescan_s3(
        self,
        actor_id: str,
        bucket: str = "story-boards-assets",
        s3_prefix: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Force rescan of S3 for an actor.
        
        Args:
            actor_id: Actor ID
            bucket: S3 bucket name
            s3_prefix: S3 prefix
            
        Returns:
            Updated manifest info
        """
        logger.info(f"Force rescanning S3 for actor: {actor_id}")
        
        return self.get_training_data(
            actor_id=actor_id,
            bucket=bucket,
            s3_prefix=s3_prefix,
            force_rescan=True
        )


# Singleton instance
_api_instance = None


def get_training_data_api() -> TrainingDataAPI:
    """Get singleton TrainingDataAPI instance."""
    global _api_instance
    if _api_instance is None:
        _api_instance = TrainingDataAPI()
    return _api_instance
