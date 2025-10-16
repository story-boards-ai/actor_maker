"""
Automatic training data manifest synchronization with S3.
Scans S3, creates/updates manifests, and detects deleted files.
"""

import logging
import boto3
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path

from .training_data_manifest import TrainingDataManifest

logger = logging.getLogger(__name__)


class TrainingDataSync:
    """Synchronizes training data manifests with S3 storage."""
    
    def __init__(
        self,
        aws_access_key: Optional[str] = None,
        aws_secret_key: Optional[str] = None,
        aws_region: str = "us-west-1"
    ):
        """
        Initialize S3 sync service.
        
        Args:
            aws_access_key: AWS access key (defaults to env var)
            aws_secret_key: AWS secret key (defaults to env var)
            aws_region: AWS region
        """
        import os
        
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=aws_access_key or os.getenv('AWS_ACCESS_KEY'),
            aws_secret_access_key=aws_secret_key or os.getenv('AWS_ACCESS_SECRET'),
            region_name=aws_region
        )
        
        logger.info("TrainingDataSync initialized")
    
    def auto_initialize_manifest(
        self,
        actor_id: str,
        bucket: str,
        s3_prefix: str = None,
        force_rescan: bool = False
    ) -> TrainingDataManifest:
        """
        Auto-initialize manifest for an actor by scanning S3.
        Creates manifest if it doesn't exist, or syncs if it does.
        
        Args:
            actor_id: Actor ID
            bucket: S3 bucket name
            s3_prefix: S3 prefix for training data (e.g., "system_actors/training_data/actor_id")
            force_rescan: Force full rescan even if manifest exists
            
        Returns:
            TrainingDataManifest instance
        """
        logger.info(f"Auto-initializing manifest for actor: {actor_id}")
        
        # Load or create manifest
        manifest = TrainingDataManifest(actor_id)
        
        # Determine S3 prefix
        if not s3_prefix:
            s3_prefix = f"system_actors/training_data/{actor_id}/"
        elif not s3_prefix.endswith('/'):
            s3_prefix += '/'
        
        # Scan S3 for training images
        s3_images = self._scan_s3_training_data(bucket, s3_prefix)
        
        if not s3_images:
            logger.info(f"No training images found in S3 for actor {actor_id}")
            manifest.save()
            return manifest
        
        logger.info(f"Found {len(s3_images)} images in S3 for actor {actor_id}")
        
        # Check if manifest needs initialization
        if manifest.manifest['total_images'] == 0 or force_rescan:
            logger.info("Initializing manifest from S3 scan")
            self._initialize_from_s3(manifest, s3_images)
        else:
            logger.info("Syncing existing manifest with S3")
            self._sync_with_s3(manifest, s3_images)
        
        manifest.save()
        return manifest
    
    def _scan_s3_training_data(
        self,
        bucket: str,
        prefix: str
    ) -> List[Dict[str, Any]]:
        """
        Scan S3 for training data images.
        
        Args:
            bucket: S3 bucket name
            prefix: S3 prefix to scan
            
        Returns:
            List of image metadata dictionaries
        """
        logger.info(f"Scanning S3: s3://{bucket}/{prefix}")
        
        images = []
        
        try:
            # List objects in S3
            paginator = self.s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=bucket, Prefix=prefix)
            
            for page in pages:
                if 'Contents' not in page:
                    continue
                
                for obj in page['Contents']:
                    key = obj['Key']
                    
                    # Skip directories and non-image files
                    if key.endswith('/'):
                        continue
                    
                    # Check if it's an image file
                    if not any(key.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.webp']):
                        continue
                    
                    # Extract filename
                    filename = Path(key).name
                    
                    # Build S3 URL
                    s3_url = f"https://{bucket}.s3.{self.s3_client.meta.region_name}.amazonaws.com/{key}"
                    
                    # Get metadata
                    images.append({
                        'filename': filename,
                        's3_url': s3_url,
                        's3_key': key,
                        'last_modified': obj['LastModified'].isoformat(),
                        'size': obj['Size'],
                        'etag': obj['ETag'].strip('"')
                    })
            
            logger.info(f"Found {len(images)} training images in S3")
            return images
            
        except Exception as e:
            logger.error(f"Failed to scan S3: {e}")
            return []
    
    def _initialize_from_s3(
        self,
        manifest: TrainingDataManifest,
        s3_images: List[Dict[str, Any]]
    ) -> None:
        """
        Initialize manifest from S3 scan.
        
        Args:
            manifest: TrainingDataManifest instance
            s3_images: List of S3 image metadata
        """
        logger.info(f"Initializing manifest with {len(s3_images)} images from S3")
        
        # Group images by generation (try to detect from filename patterns)
        image_dict = {}
        
        for img in s3_images:
            filename = img['filename']
            
            image_dict[filename] = {
                's3_url': img['s3_url'],
                's3_key': img['s3_key'],
                'prompt': 'Existing training data (auto-detected from S3)',
                'prompt_preview': 'Existing training data',
                'generated_at': img['last_modified'],
                'last_modified': img['last_modified'],
                'size': img['size'],
                'etag': img['etag'],
                'index': len(image_dict) + 1,
                'source': 's3_scan'
            }
        
        # Add as a single generation
        manifest.add_generation(
            images=image_dict,
            generation_type='s3_scan',
            metadata={
                'scanned_at': datetime.now().isoformat(),
                'total_scanned': len(s3_images)
            }
        )
        
        logger.info(f"Initialized manifest with {len(image_dict)} images")
    
    def _sync_with_s3(
        self,
        manifest: TrainingDataManifest,
        s3_images: List[Dict[str, Any]]
    ) -> None:
        """
        Sync existing manifest with S3 (detect additions/deletions).
        
        Args:
            manifest: TrainingDataManifest instance
            s3_images: List of S3 image metadata
        """
        logger.info("Syncing manifest with S3")
        
        # Get current images from manifest
        current_images = manifest.get_all_images()
        current_urls = {img['s3_url'] for img in current_images.values()}
        
        # Get S3 URLs
        s3_urls = {img['s3_url'] for img in s3_images}
        s3_by_url = {img['s3_url']: img for img in s3_images}
        
        # Detect deletions
        deleted_urls = current_urls - s3_urls
        if deleted_urls:
            logger.info(f"Detected {len(deleted_urls)} deleted images")
            self._remove_deleted_images(manifest, deleted_urls)
        
        # Detect additions
        new_urls = s3_urls - current_urls
        if new_urls:
            logger.info(f"Detected {len(new_urls)} new images")
            new_images = [s3_by_url[url] for url in new_urls]
            self._add_new_images(manifest, new_images)
        
        # Update timestamps for existing images
        self._update_timestamps(manifest, s3_by_url)
        
        logger.info("Sync complete")
    
    def _remove_deleted_images(
        self,
        manifest: TrainingDataManifest,
        deleted_urls: set
    ) -> None:
        """
        Remove deleted images from manifest.
        
        Args:
            manifest: TrainingDataManifest instance
            deleted_urls: Set of deleted S3 URLs
        """
        images = manifest.manifest['images']
        
        # Find and remove deleted images
        to_remove = []
        for filename, data in images.items():
            if data['s3_url'] in deleted_urls:
                to_remove.append(filename)
                logger.info(f"Removing deleted image: {filename}")
        
        for filename in to_remove:
            del images[filename]
        
        # Update total count
        manifest.manifest['total_images'] = len(images)
        manifest.manifest['updated_at'] = datetime.now().isoformat()
        
        logger.info(f"Removed {len(to_remove)} deleted images from manifest")
    
    def _add_new_images(
        self,
        manifest: TrainingDataManifest,
        new_images: List[Dict[str, Any]]
    ) -> None:
        """
        Add newly detected images to manifest.
        
        Args:
            manifest: TrainingDataManifest instance
            new_images: List of new S3 image metadata
        """
        image_dict = {}
        
        for img in new_images:
            filename = img['filename']
            
            image_dict[filename] = {
                's3_url': img['s3_url'],
                's3_key': img['s3_key'],
                'prompt': 'New training data (auto-detected from S3)',
                'prompt_preview': 'New training data',
                'generated_at': img['last_modified'],
                'last_modified': img['last_modified'],
                'size': img['size'],
                'etag': img['etag'],
                'index': manifest.manifest['total_images'] + len(image_dict) + 1,
                'source': 's3_sync'
            }
        
        # Add as a new generation
        manifest.add_generation(
            images=image_dict,
            generation_type='s3_sync',
            metadata={
                'synced_at': datetime.now().isoformat(),
                'auto_detected': True
            }
        )
        
        logger.info(f"Added {len(image_dict)} new images to manifest")
    
    def _update_timestamps(
        self,
        manifest: TrainingDataManifest,
        s3_by_url: Dict[str, Dict[str, Any]]
    ) -> None:
        """
        Update last_modified timestamps for existing images.
        
        Args:
            manifest: TrainingDataManifest instance
            s3_by_url: Dictionary of S3 images by URL
        """
        images = manifest.manifest['images']
        updated_count = 0
        
        for filename, data in images.items():
            s3_url = data['s3_url']
            
            if s3_url in s3_by_url:
                s3_img = s3_by_url[s3_url]
                
                # Update timestamp if changed
                if data.get('last_modified') != s3_img['last_modified']:
                    data['last_modified'] = s3_img['last_modified']
                    data['size'] = s3_img['size']
                    data['etag'] = s3_img['etag']
                    updated_count += 1
        
        if updated_count > 0:
            logger.info(f"Updated timestamps for {updated_count} images")
