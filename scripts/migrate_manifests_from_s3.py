#!/usr/bin/env python3
"""
Temporary migration script to populate manifests with training data from S3.

This script:
1. Scans all manifest files in data/actor_manifests/
2. For manifests with empty training_data arrays, scans S3 for training images
3. Populates training_data array with S3 URLs and metadata
4. Updates statistics and timestamps
5. Backs up original manifests before modification

Usage:
    python3 scripts/migrate_manifests_from_s3.py [--dry-run] [--actor-id ACTOR_ID]
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
import shutil
import argparse

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.training_data_sync import TrainingDataSync
from src.training_data_manifest import TrainingDataManifest

MANIFEST_DIR = project_root / "data" / "actor_manifests"
BACKUP_DIR = project_root / "data" / "manifest_backups"


def backup_manifest(manifest_path: Path) -> Path:
    """Create a backup of the manifest file."""
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_name = f"{manifest_path.stem}_{timestamp}.json"
    backup_path = BACKUP_DIR / backup_name
    shutil.copy2(manifest_path, backup_path)
    return backup_path


def migrate_manifest(manifest_path: Path, dry_run: bool = False) -> Dict[str, Any]:
    """
    Migrate a single manifest by populating training_data from S3.
    
    Returns:
        Dict with migration statistics
    """
    stats = {
        "actor_id": manifest_path.stem.replace("_manifest", ""),
        "actor_name": None,
        "had_empty_training_data": False,
        "images_found_in_s3": 0,
        "images_added": 0,
        "backup_created": False,
        "error": None,
        "skipped": False
    }
    
    try:
        # Load manifest
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
        
        actor_name = manifest.get("character_name")
        stats["actor_name"] = actor_name
        
        # Check if training_data is empty
        training_data = manifest.get("training_data", [])
        stats["had_empty_training_data"] = len(training_data) == 0
        
        if not stats["had_empty_training_data"]:
            stats["skipped"] = True
            stats["images_added"] = len(training_data)
            return stats
        
        print(f"\n[{stats['actor_id']}] Processing {actor_name}...")
        print(f"  Current training_data entries: {len(training_data)}")
        
        if dry_run:
            print(f"  [DRY RUN] Would scan S3 and populate manifest")
            return stats
        
        # Create backup before modifying
        backup_path = backup_manifest(manifest_path)
        stats["backup_created"] = True
        print(f"  ✓ Backup created: {backup_path.name}")
        
        # Use TrainingDataSync to auto-initialize from S3
        print(f"  Scanning S3 for training images...")
        sync = TrainingDataSync()
        result = sync.auto_initialize_manifest(actor_name)
        
        stats["images_found_in_s3"] = result.get("images_found", 0)
        stats["images_added"] = result.get("images_added", 0)
        
        if stats["images_added"] > 0:
            print(f"  ✓ Added {stats['images_added']} images from S3")
        else:
            print(f"  ⚠ No training images found in S3")
        
        return stats
        
    except Exception as e:
        stats["error"] = str(e)
        print(f"  ✗ Error: {e}")
        return stats


def main():
    parser = argparse.ArgumentParser(description="Migrate manifests by populating training_data from S3")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done without making changes")
    parser.add_argument("--actor-id", type=str, help="Only migrate specific actor ID (e.g., 0107)")
    args = parser.parse_args()
    
    print("=" * 80)
    print("MANIFEST MIGRATION: Populate training_data from S3")
    print("=" * 80)
    
    if args.dry_run:
        print("\n⚠️  DRY RUN MODE - No changes will be made\n")
    
    # Find all manifest files
    if args.actor_id:
        manifest_files = [MANIFEST_DIR / f"{args.actor_id}_manifest.json"]
        if not manifest_files[0].exists():
            print(f"✗ Manifest not found: {manifest_files[0]}")
            return 1
    else:
        manifest_files = sorted(MANIFEST_DIR.glob("*_manifest.json"))
    
    print(f"\nFound {len(manifest_files)} manifest files\n")
    
    # Migration statistics
    total_stats = {
        "total_manifests": len(manifest_files),
        "manifests_migrated": 0,
        "manifests_skipped": 0,
        "manifests_failed": 0,
        "total_images_added": 0,
        "backups_created": 0
    }
    
    # Migrate each manifest
    for manifest_path in manifest_files:
        stats = migrate_manifest(manifest_path, dry_run=args.dry_run)
        
        if stats["error"]:
            total_stats["manifests_failed"] += 1
        elif stats["skipped"]:
            total_stats["manifests_skipped"] += 1
        else:
            total_stats["manifests_migrated"] += 1
            total_stats["total_images_added"] += stats["images_added"]
            if stats["backup_created"]:
                total_stats["backups_created"] += 1
    
    # Print summary
    print("\n" + "=" * 80)
    print("MIGRATION SUMMARY")
    print("=" * 80)
    print(f"Total manifests processed:  {total_stats['total_manifests']}")
    print(f"  Migrated:                 {total_stats['manifests_migrated']}")
    print(f"  Skipped (already had data): {total_stats['manifests_skipped']}")
    print(f"  Failed:                   {total_stats['manifests_failed']}")
    print(f"\nTotal images added:         {total_stats['total_images_added']}")
    print(f"Backups created:            {total_stats['backups_created']}")
    
    if args.dry_run:
        print("\n⚠️  This was a DRY RUN - no changes were made")
        print("Run without --dry-run to apply changes")
    else:
        print(f"\n✓ Migration complete")
        if total_stats["backups_created"] > 0:
            print(f"  Backups saved to: {BACKUP_DIR}")
    
    print("=" * 80)
    
    return 0 if total_stats["manifests_failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
