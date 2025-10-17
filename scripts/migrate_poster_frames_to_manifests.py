#!/usr/bin/env python3
"""
Migrate poster frame URLs to manifests.

This script:
1. Finds all poster_frame JSON files in data/actors/{actor_id}/poster_frame/
2. Reads the poster frame URLs from each JSON file
3. Updates the corresponding manifest file with the poster frame data
4. Keeps the local JSON files (they can be deleted manually later if needed)

Usage:
    python scripts/migrate_poster_frames_to_manifests.py [--dry-run]
"""

import os
import sys
import json
import logging
from pathlib import Path
from typing import Dict, Optional

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class PosterFrameMigrator:
    """Migrates poster frame URLs to actor manifests."""
    
    def __init__(self, dry_run: bool = False):
        """
        Initialize migrator.
        
        Args:
            dry_run: If True, only simulate actions without making changes
        """
        self.dry_run = dry_run
        
        self.stats = {
            'total_actors': 0,
            'poster_frames_found': 0,
            'manifests_updated': 0,
            'skipped_no_poster': 0,
            'skipped_no_manifest': 0,
            'errors': 0
        }
    
    def find_all_actors(self) -> list:
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
    
    def find_poster_frame_json(self, actor_id: str) -> Optional[Path]:
        """
        Find poster frame JSON file for an actor.
        
        Args:
            actor_id: Actor ID
            
        Returns:
            Path to poster frame JSON if found, None otherwise
        """
        poster_frame_dir = project_root / "data" / "actors" / actor_id / "poster_frame"
        
        if not poster_frame_dir.exists():
            return None
        
        # Look for the poster_urls.json file
        poster_json = poster_frame_dir / f"{actor_id}_poster_urls.json"
        
        if poster_json.exists():
            return poster_json
        
        return None
    
    def read_poster_frame_data(self, poster_json_path: Path) -> Optional[Dict]:
        """
        Read poster frame data from JSON file.
        
        Args:
            poster_json_path: Path to poster frame JSON file
            
        Returns:
            Poster frame data dictionary or None if error
        """
        try:
            with open(poster_json_path, 'r') as f:
                data = json.load(f)
            return data
        except Exception as e:
            logger.error(f"Failed to read {poster_json_path}: {e}")
            return None
    
    def update_manifest(self, actor_id: str, poster_data: Dict) -> bool:
        """
        Update manifest file with poster frame data.
        
        Args:
            actor_id: Actor ID (full name like "0219_asian_43_male")
            poster_data: Poster frame data dictionary
            
        Returns:
            True if successful, False otherwise
        """
        # Extract numeric ID from actor_id (e.g., "0219" from "0219_asian_43_male")
        numeric_id = actor_id.split('_')[0]
        manifest_path = project_root / "data" / "actor_manifests" / f"{numeric_id}_manifest.json"
        
        if not manifest_path.exists():
            logger.warning(f"  Manifest not found: {manifest_path}")
            return False
        
        logger.info(f"  Updating manifest: {manifest_path.name}")
        
        if self.dry_run:
            logger.info("  [DRY RUN] Would update manifest with poster frame data")
            return True
        
        try:
            # Read manifest
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            
            # Add poster_frames section
            manifest['poster_frames'] = poster_data
            
            # Write updated manifest
            with open(manifest_path, 'w') as f:
                json.dump(manifest, f, indent=2)
            
            logger.info(f"  ✓ Manifest updated with poster frame data")
            return True
            
        except Exception as e:
            logger.error(f"  ✗ Error updating manifest: {e}", exc_info=True)
            return False
    
    def migrate_actor(self, actor_id: str) -> bool:
        """
        Migrate poster frame data for a single actor.
        
        Args:
            actor_id: Actor ID
            
        Returns:
            True if successful, False otherwise
        """
        logger.info(f"\n{'='*60}")
        logger.info(f"Processing: {actor_id}")
        logger.info(f"{'='*60}")
        
        try:
            # Find poster frame JSON
            poster_json_path = self.find_poster_frame_json(actor_id)
            
            if not poster_json_path:
                logger.info(f"  No poster frame JSON found for {actor_id}")
                self.stats['skipped_no_poster'] += 1
                return False
            
            logger.info(f"  Found poster frame JSON: {poster_json_path}")
            
            # Read poster frame data
            poster_data = self.read_poster_frame_data(poster_json_path)
            
            if not poster_data:
                logger.error(f"  Failed to read poster frame data")
                self.stats['errors'] += 1
                return False
            
            self.stats['poster_frames_found'] += 1
            
            # Update manifest
            if self.update_manifest(actor_id, poster_data):
                self.stats['manifests_updated'] += 1
                logger.info(f"  ✓ Successfully migrated poster frame data for {actor_id}")
                return True
            else:
                self.stats['skipped_no_manifest'] += 1
                return False
            
        except Exception as e:
            logger.error(f"  ✗ Error migrating {actor_id}: {e}", exc_info=True)
            self.stats['errors'] += 1
            return False
    
    def migrate_all(self) -> Dict:
        """
        Migrate all actor poster frames.
        
        Returns:
            Statistics dictionary
        """
        logger.info("\n" + "="*60)
        logger.info("POSTER FRAME MIGRATION TO MANIFESTS")
        logger.info("="*60)
        
        if self.dry_run:
            logger.info("🔍 DRY RUN MODE - No changes will be made")
        
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
        logger.info(f"Total actors:              {self.stats['total_actors']}")
        logger.info(f"Poster frames found:       {self.stats['poster_frames_found']}")
        logger.info(f"Manifests updated:         {self.stats['manifests_updated']}")
        logger.info(f"Skipped (no poster):       {self.stats['skipped_no_poster']}")
        logger.info(f"Skipped (no manifest):     {self.stats['skipped_no_manifest']}")
        logger.info(f"Errors:                    {self.stats['errors']}")
        logger.info("="*60)
        
        if self.dry_run:
            logger.info("\n🔍 This was a DRY RUN - no changes were made")
            logger.info("Run without --dry-run to perform actual migration")


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Migrate poster frame URLs to actor manifests',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Dry run (preview changes)
  python scripts/migrate_poster_frames_to_manifests.py --dry-run
  
  # Perform actual migration
  python scripts/migrate_poster_frames_to_manifests.py
        """
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview changes without making them'
    )
    
    args = parser.parse_args()
    
    # Create migrator and run
    migrator = PosterFrameMigrator(dry_run=args.dry_run)
    stats = migrator.migrate_all()
    
    # Exit with error code if there were errors
    sys.exit(1 if stats['errors'] > 0 else 0)


if __name__ == '__main__':
    main()
