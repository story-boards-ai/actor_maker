#!/usr/bin/env python3
"""
Migrate base images to S3.

This script:
1. Finds all base images in data/actors/{actor_id}/base_image/
2. Converts them to JPEG format
3. Uploads to S3: story-boards-assets/system_actors/base_images/{actor_id}_base.jpg
4. Updates manifest files with S3 URL
5. Removes local base_image directories

Usage:
    python scripts/migrate_base_images_to_s3.py [--dry-run]
"""

import os
import sys
import json
import shutil
import logging
from pathlib import Path
from typing import Dict, List, Optional
from PIL import Image
import io

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.utils.s3 import S3Client, S3Config

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class BaseImageMigrator:
    """Migrates base images to S3 and updates manifests."""
    
    def __init__(self, dry_run: bool = False):
        """
        Initialize migrator.
        
        Args:
            dry_run: If True, only simulate actions without making changes
        """
        self.dry_run = dry_run
        self.s3_client = S3Client()
        self.bucket = "story-boards-assets"
        self.s3_prefix = "system_actors/base_images"
        
        self.stats = {
            'total_actors': 0,
            'converted': 0,
            'uploaded': 0,
            'manifests_updated': 0,
            'local_deleted': 0,
            'skipped': 0,
            'errors': 0
        }
    
    def find_all_actors(self) -> List[str]:
        """Find all actor directories."""
        actors_dir = project_root / "data" / "actors"
        
        if not actors_dir.exists():
            logger.error(f"Actors directory not found: {actors_dir}")
            return []
        
        actor_ids = []
        for actor_dir in sorted(actors_dir.iterdir()):
            if actor_dir.is_dir() and not actor_dir.name.startswith('.'):
                actor_ids.append(actor_dir.name)
        
        logger.info(f"Found {len(actor_ids)} actors")
        return actor_ids
    
    def find_base_image(self, actor_id: str) -> Optional[Path]:
        """
        Find base image for an actor.
        
        Args:
            actor_id: Actor ID
            
        Returns:
            Path to base image if found, None otherwise
        """
        base_image_dir = project_root / "data" / "actors" / actor_id / "base_image"
        
        if not base_image_dir.exists():
            return None
        
        # Look for base image files
        for ext in ['png', 'jpg', 'jpeg', 'webp']:
            base_image_path = base_image_dir / f"{actor_id}_base.{ext}"
            if base_image_path.exists():
                return base_image_path
        
        # Look for any image file in the directory
        for image_file in base_image_dir.glob("*"):
            if image_file.suffix.lower() in ['.png', '.jpg', '.jpeg', '.webp']:
                return image_file
        
        return None
    
    def convert_to_jpeg(self, image_path: Path) -> bytes:
        """
        Convert image to JPEG format.
        
        Args:
            image_path: Path to source image
            
        Returns:
            JPEG image bytes
        """
        logger.info(f"  Converting {image_path.name} to JPEG...")
        
        # Open image
        img = Image.open(image_path)
        
        # Convert RGBA to RGB if needed
        if img.mode in ('RGBA', 'LA', 'P'):
            # Create white background
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Save to bytes buffer
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=95, optimize=True)
        jpeg_bytes = buffer.getvalue()
        
        logger.info(f"  Converted to JPEG: {len(jpeg_bytes) / 1024 / 1024:.2f} MB")
        return jpeg_bytes
    
    def upload_to_s3(self, actor_id: str, jpeg_bytes: bytes) -> str:
        """
        Upload JPEG to S3.
        
        Args:
            actor_id: Actor ID
            jpeg_bytes: JPEG image bytes
            
        Returns:
            S3 URL
        """
        s3_key = f"{self.s3_prefix}/{actor_id}_base.jpg"
        
        logger.info(f"  Uploading to S3: s3://{self.bucket}/{s3_key}")
        
        if self.dry_run:
            logger.info("  [DRY RUN] Would upload to S3")
            return f"https://{self.bucket}.s3-accelerate.amazonaws.com/{s3_key}"
        
        # Upload to S3
        result = self.s3_client.upload_image(
            image_data=jpeg_bytes,
            bucket=self.bucket,
            key=s3_key,
            extension='jpg'
        )
        
        s3_url = result['Location']
        logger.info(f"  Uploaded: {s3_url}")
        
        return s3_url
    
    def update_manifest(self, actor_id: str, s3_url: str) -> bool:
        """
        Update manifest file with S3 URL.
        
        Args:
            actor_id: Actor ID (full name like "0002_european_35_female")
            s3_url: S3 URL of base image
            
        Returns:
            True if successful, False otherwise
        """
        # Extract numeric ID from actor_id (e.g., "0002" from "0002_european_35_female")
        numeric_id = actor_id.split('_')[0]
        manifest_path = project_root / "data" / "actor_manifests" / f"{numeric_id}_manifest.json"
        
        if not manifest_path.exists():
            logger.warning(f"  Manifest not found: {manifest_path}")
            return False
        
        logger.info(f"  Updating manifest: {manifest_path.name}")
        
        if self.dry_run:
            logger.info("  [DRY RUN] Would update manifest")
            return True
        
        # Read manifest
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
        
        # Update base_images section
        manifest['base_images'] = [{
            'filename': f"{actor_id}_base.jpg",
            's3_url': s3_url,
            'status': 'synced',
            'format': 'jpeg'
        }]
        
        # Update statistics
        if 'statistics' not in manifest:
            manifest['statistics'] = {}
        manifest['statistics']['base_images_count'] = 1
        
        # Write updated manifest
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
        
        logger.info(f"  ✓ Manifest updated")
        return True
    
    def delete_local_base_image(self, actor_id: str) -> bool:
        """
        Delete local base_image directory.
        
        Args:
            actor_id: Actor ID
            
        Returns:
            True if successful, False otherwise
        """
        base_image_dir = project_root / "data" / "actors" / actor_id / "base_image"
        
        if not base_image_dir.exists():
            return True
        
        logger.info(f"  Deleting local directory: {base_image_dir}")
        
        if self.dry_run:
            logger.info("  [DRY RUN] Would delete local directory")
            return True
        
        try:
            shutil.rmtree(base_image_dir)
            logger.info(f"  ✓ Deleted local base_image directory")
            return True
        except Exception as e:
            logger.error(f"  ✗ Failed to delete directory: {e}")
            return False
    
    def migrate_actor(self, actor_id: str) -> bool:
        """
        Migrate base image for a single actor.
        
        Args:
            actor_id: Actor ID
            
        Returns:
            True if successful, False otherwise
        """
        logger.info(f"\n{'='*60}")
        logger.info(f"Processing: {actor_id}")
        logger.info(f"{'='*60}")
        
        try:
            # Find base image
            base_image_path = self.find_base_image(actor_id)
            
            if not base_image_path:
                logger.warning(f"  No base image found for {actor_id}")
                self.stats['skipped'] += 1
                return False
            
            logger.info(f"  Found base image: {base_image_path}")
            
            # Convert to JPEG
            jpeg_bytes = self.convert_to_jpeg(base_image_path)
            self.stats['converted'] += 1
            
            # Upload to S3
            s3_url = self.upload_to_s3(actor_id, jpeg_bytes)
            self.stats['uploaded'] += 1
            
            # Update manifest
            if self.update_manifest(actor_id, s3_url):
                self.stats['manifests_updated'] += 1
            
            # Delete local files
            if self.delete_local_base_image(actor_id):
                self.stats['local_deleted'] += 1
            
            logger.info(f"  ✓ Successfully migrated {actor_id}")
            return True
            
        except Exception as e:
            logger.error(f"  ✗ Error migrating {actor_id}: {e}", exc_info=True)
            self.stats['errors'] += 1
            return False
    
    def migrate_all(self) -> Dict:
        """
        Migrate all actor base images.
        
        Returns:
            Statistics dictionary
        """
        logger.info("\n" + "="*60)
        logger.info("BASE IMAGE MIGRATION TO S3")
        logger.info("="*60)
        
        if self.dry_run:
            logger.info("🔍 DRY RUN MODE - No changes will be made")
        
        logger.info(f"Bucket: {self.bucket}")
        logger.info(f"S3 Prefix: {self.s3_prefix}")
        logger.info("")
        
        # Find all actors
        actor_ids = self.find_all_actors()
        self.stats['total_actors'] = len(actor_ids)
        
        if not actor_ids:
            logger.error("No actors found!")
            return self.stats
        
        # Migrate each actor
        for actor_id in actor_ids:
            self.migrate_actor(actor_id)
        
        # Print summary
        self.print_summary()
        
        return self.stats
    
    def print_summary(self):
        """Print migration summary."""
        logger.info("\n" + "="*60)
        logger.info("MIGRATION SUMMARY")
        logger.info("="*60)
        logger.info(f"Total actors:          {self.stats['total_actors']}")
        logger.info(f"Converted to JPEG:     {self.stats['converted']}")
        logger.info(f"Uploaded to S3:        {self.stats['uploaded']}")
        logger.info(f"Manifests updated:     {self.stats['manifests_updated']}")
        logger.info(f"Local files deleted:   {self.stats['local_deleted']}")
        logger.info(f"Skipped (no image):    {self.stats['skipped']}")
        logger.info(f"Errors:                {self.stats['errors']}")
        logger.info("="*60)
        
        if self.dry_run:
            logger.info("\n🔍 This was a DRY RUN - no changes were made")
            logger.info("Run without --dry-run to perform actual migration")


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Migrate actor base images to S3',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Dry run (preview changes)
  python scripts/migrate_base_images_to_s3.py --dry-run
  
  # Perform actual migration
  python scripts/migrate_base_images_to_s3.py
        """
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview changes without making them'
    )
    
    args = parser.parse_args()
    
    # Create migrator and run
    migrator = BaseImageMigrator(dry_run=args.dry_run)
    stats = migrator.migrate_all()
    
    # Exit with error code if there were errors
    sys.exit(1 if stats['errors'] > 0 else 0)


if __name__ == '__main__':
    main()
