#!/usr/bin/env python3
"""
Update actor manifests with S3 base image URLs.

This script updates existing manifests to include S3 URLs for base images
that have already been uploaded to S3.

Usage:
    python scripts/update_manifests_with_s3_urls.py [--dry-run]
"""

import os
import sys
import json
import logging
from pathlib import Path
from typing import List

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ManifestUpdater:
    """Updates actor manifests with S3 base image URLs."""
    
    def __init__(self, dry_run: bool = False):
        """
        Initialize updater.
        
        Args:
            dry_run: If True, only simulate actions without making changes
        """
        self.dry_run = dry_run
        self.bucket = "story-boards-assets"
        self.s3_prefix = "system_actors/base_images"
        
        self.stats = {
            'total_manifests': 0,
            'updated': 0,
            'skipped': 0,
            'errors': 0
        }
    
    def find_all_manifests(self) -> List[Path]:
        """Find all actor manifest files."""
        manifests_dir = project_root / "data" / "actor_manifests"
        
        if not manifests_dir.exists():
            logger.error(f"Manifests directory not found: {manifests_dir}")
            return []
        
        manifests = sorted(manifests_dir.glob("*_manifest.json"))
        logger.info(f"Found {len(manifests)} manifest files")
        return manifests
    
    def get_actor_full_name(self, manifest_path: Path) -> str:
        """
        Get full actor name from manifest.
        
        Args:
            manifest_path: Path to manifest file
            
        Returns:
            Full actor name (e.g., "0002_european_35_female")
        """
        try:
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            return manifest.get('character_name', '')
        except Exception as e:
            logger.error(f"Failed to read manifest {manifest_path}: {e}")
            return ''
    
    def update_manifest(self, manifest_path: Path) -> bool:
        """
        Update a single manifest with S3 URL.
        
        Args:
            manifest_path: Path to manifest file
            
        Returns:
            True if successful, False otherwise
        """
        logger.info(f"\n{'='*60}")
        logger.info(f"Processing: {manifest_path.name}")
        logger.info(f"{'='*60}")
        
        try:
            # Read manifest
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            
            # Get actor full name
            actor_full_name = manifest.get('character_name', '')
            if not actor_full_name:
                logger.warning(f"  No character_name found in manifest")
                self.stats['skipped'] += 1
                return False
            
            logger.info(f"  Actor: {actor_full_name}")
            
            # Build S3 URL
            s3_url = f"https://{self.bucket}.s3.us-west-1.amazonaws.com/{self.s3_prefix}/{actor_full_name}_base.jpg"
            logger.info(f"  S3 URL: {s3_url}")
            
            # Update base_images section
            manifest['base_images'] = [{
                'filename': f"{actor_full_name}_base.jpg",
                's3_url': s3_url,
                'status': 'synced',
                'format': 'jpeg'
            }]
            
            # Update statistics
            if 'statistics' not in manifest:
                manifest['statistics'] = {}
            manifest['statistics']['base_images_count'] = 1
            
            if self.dry_run:
                logger.info("  [DRY RUN] Would update manifest")
                return True
            
            # Write updated manifest
            with open(manifest_path, 'w') as f:
                json.dump(manifest, f, indent=2)
            
            logger.info(f"  ✓ Manifest updated")
            return True
            
        except Exception as e:
            logger.error(f"  ✗ Error updating manifest: {e}", exc_info=True)
            self.stats['errors'] += 1
            return False
    
    def update_all(self):
        """Update all manifests."""
        logger.info("\n" + "="*60)
        logger.info("MANIFEST UPDATE WITH S3 URLS")
        logger.info("="*60)
        
        if self.dry_run:
            logger.info("🔍 DRY RUN MODE - No changes will be made")
        
        logger.info(f"Bucket: {self.bucket}")
        logger.info(f"S3 Prefix: {self.s3_prefix}")
        logger.info("")
        
        # Find all manifests
        manifests = self.find_all_manifests()
        self.stats['total_manifests'] = len(manifests)
        
        if not manifests:
            logger.error("No manifests found!")
            return self.stats
        
        # Update each manifest
        for manifest_path in manifests:
            if self.update_manifest(manifest_path):
                self.stats['updated'] += 1
        
        # Print summary
        self.print_summary()
        
        return self.stats
    
    def print_summary(self):
        """Print update summary."""
        logger.info("\n" + "="*60)
        logger.info("UPDATE SUMMARY")
        logger.info("="*60)
        logger.info(f"Total manifests:       {self.stats['total_manifests']}")
        logger.info(f"Updated:               {self.stats['updated']}")
        logger.info(f"Skipped:               {self.stats['skipped']}")
        logger.info(f"Errors:                {self.stats['errors']}")
        logger.info("="*60)
        
        if self.dry_run:
            logger.info("\n🔍 This was a DRY RUN - no changes were made")
            logger.info("Run without --dry-run to perform actual updates")


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Update actor manifests with S3 base image URLs',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Dry run (preview changes)
  python scripts/update_manifests_with_s3_urls.py --dry-run
  
  # Perform actual updates
  python scripts/update_manifests_with_s3_urls.py
        """
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview changes without making them'
    )
    
    args = parser.parse_args()
    
    # Create updater and run
    updater = ManifestUpdater(dry_run=args.dry_run)
    stats = updater.update_all()
    
    # Exit with error code if there were errors
    sys.exit(1 if stats['errors'] > 0 else 0)


if __name__ == '__main__':
    main()
