#!/usr/bin/env python3
"""
Find and clean up mismatched base images and training data.

This script:
1. Checks each manifest's base_images entry
2. Verifies the filename matches the character_name
3. If mismatched, deletes the base image from S3 and clears manifest entry
4. Also deletes all training data for that actor (both S3 and manifest)

Usage:
    python scripts/cleanup_mismatched_base_images.py [--fix]
"""

import os
import sys
import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Tuple

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Load environment variables from .env file
from dotenv import load_dotenv
env_path = project_root / '.env'
if env_path.exists():
    load_dotenv(env_path)
    logging.info(f"Loaded environment variables from {env_path}")
else:
    logging.warning(f".env file not found at {env_path}")

from src.utils.s3 import S3Client

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def find_all_manifests() -> List[Path]:
    """Find all manifest files."""
    manifests_dir = project_root / "data" / "actor_manifests"
    
    if not manifests_dir.exists():
        logger.error(f"Manifests directory not found: {manifests_dir}")
        sys.exit(1)
    
    manifests = sorted(manifests_dir.glob("*_manifest.json"))
    logger.info(f"Found {len(manifests)} manifest files")
    return manifests


def check_base_image_match(manifest_path: Path) -> Tuple[bool, str, Dict]:
    """
    Check if base image filename matches character name.
    
    Returns:
        (is_match, issue_description, manifest_data)
    """
    try:
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
    except Exception as e:
        return False, f"Failed to load manifest: {e}", {}
    
    character_name = manifest.get('character_name', '')
    base_images = manifest.get('base_images', [])
    
    if not base_images:
        # No base image - this is OK
        return True, "", manifest
    
    base_image = base_images[0]
    filename = base_image.get('filename', '')
    
    # Expected filename format: {character_name}_base.jpg
    expected_filename = f"{character_name}_base.jpg"
    
    if filename != expected_filename:
        issue = f"Filename mismatch: '{filename}' should be '{expected_filename}'"
        return False, issue, manifest
    
    return True, "", manifest


def delete_base_image_from_s3(s3_url: str, s3_client: S3Client) -> bool:
    """Delete base image from S3."""
    try:
        # Parse S3 URL to get bucket and key
        # Format: https://story-boards-assets.s3.us-west-1.amazonaws.com/system_actors/base_images/filename.jpg
        # or: https://story-boards-assets.s3-accelerate.amazonaws.com/system_actors/base_images/filename.jpg
        
        if '.s3.' in s3_url or '.s3-' in s3_url:
            # Extract bucket and key
            parts = s3_url.split('.amazonaws.com/')
            if len(parts) == 2:
                bucket_part = parts[0]
                key = parts[1]
                
                # Extract bucket name
                if 'https://' in bucket_part:
                    bucket = bucket_part.split('https://')[1].split('.')[0]
                else:
                    bucket = bucket_part.split('//')[1].split('.')[0]
                
                logger.info(f"  Deleting from S3: s3://{bucket}/{key}")
                s3_client.s3.delete_object(Bucket=bucket, Key=key)
                logger.info(f"  ✓ Deleted from S3")
                return True
        
        logger.warning(f"  Could not parse S3 URL: {s3_url}")
        return False
        
    except Exception as e:
        logger.error(f"  Failed to delete from S3: {e}")
        return False


def delete_training_data_from_s3(manifest: Dict, s3_client: S3Client) -> int:
    """Delete all training data from S3 for this actor."""
    deleted_count = 0
    training_data = manifest.get('training_data', [])
    
    if not training_data:
        return 0
    
    logger.info(f"  Deleting {len(training_data)} training images from S3...")
    
    for entry in training_data:
        s3_url = entry.get('s3_url')
        if not s3_url:
            continue
        
        try:
            # Parse S3 URL
            parts = s3_url.split('.amazonaws.com/')
            if len(parts) == 2:
                bucket_part = parts[0]
                key = parts[1]
                
                if 'https://' in bucket_part:
                    bucket = bucket_part.split('https://')[1].split('.')[0]
                else:
                    bucket = bucket_part.split('//')[1].split('.')[0]
                
                s3_client.s3.delete_object(Bucket=bucket, Key=key)
                deleted_count += 1
        except Exception as e:
            logger.warning(f"  Failed to delete training image: {e}")
    
    logger.info(f"  ✓ Deleted {deleted_count} training images from S3")
    return deleted_count


def cleanup_manifest(manifest_path: Path, manifest: Dict) -> bool:
    """
    Clean up manifest by removing base_images and training_data entries.
    """
    try:
        # Clear base_images
        manifest['base_images'] = []
        
        # Clear training_data
        manifest['training_data'] = []
        
        # Update statistics
        if 'statistics' in manifest:
            manifest['statistics']['base_images_count'] = 0
            manifest['statistics']['training_images_count'] = 0
            manifest['statistics']['training_data_size_bytes'] = 0
            manifest['statistics']['training_data_size_mb'] = 0.0
            manifest['statistics']['training_synced_count'] = 0
            manifest['statistics']['training_local_only_count'] = 0
        
        # Save updated manifest
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
        
        logger.info(f"  ✓ Cleaned up manifest")
        return True
        
    except Exception as e:
        logger.error(f"  Failed to update manifest: {e}")
        return False


def process_manifest(manifest_path: Path, s3_client: S3Client, fix: bool) -> Tuple[bool, str]:
    """
    Process a single manifest.
    
    Returns:
        (had_issues, description)
    """
    is_match, issue, manifest = check_base_image_match(manifest_path)
    
    if is_match:
        return False, ""
    
    character_name = manifest.get('character_name', 'unknown')
    base_images = manifest.get('base_images', [])
    
    logger.warning(f"✗ {manifest_path.name} ({character_name})")
    logger.warning(f"  Issue: {issue}")
    
    if not fix:
        return True, issue
    
    # Fix mode - delete everything
    logger.info(f"  Cleaning up mismatched data...")
    
    # Delete base image from S3
    if base_images and base_images[0].get('s3_url'):
        delete_base_image_from_s3(base_images[0]['s3_url'], s3_client)
    
    # Delete training data from S3
    training_count = len(manifest.get('training_data', []))
    if training_count > 0:
        deleted = delete_training_data_from_s3(manifest, s3_client)
        logger.info(f"  Deleted {deleted}/{training_count} training images")
    
    # Clean up manifest
    cleanup_manifest(manifest_path, manifest)
    
    logger.info(f"  ✓ Cleanup complete for {character_name}")
    
    return True, issue


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Find and clean up mismatched base images and training data',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        '--fix',
        action='store_true',
        help='Delete mismatched base images and training data'
    )
    
    args = parser.parse_args()
    
    logger.info("="*80)
    logger.info("BASE IMAGE MISMATCH CLEANUP")
    logger.info("="*80)
    
    if args.fix:
        logger.warning("⚠️  FIX MODE ENABLED - Will delete mismatched data from S3!")
        logger.warning("⚠️  Press Ctrl+C within 5 seconds to cancel...")
        import time
        time.sleep(5)
        logger.info("Proceeding with cleanup...")
    
    # Initialize S3 client
    s3_client = S3Client()
    
    # Find all manifests
    manifests = find_all_manifests()
    
    # Process each manifest
    total_count = 0
    mismatch_count = 0
    fixed_count = 0
    mismatched_actors = []
    
    for manifest_path in manifests:
        had_issues, issue = process_manifest(manifest_path, s3_client, args.fix)
        
        total_count += 1
        
        if had_issues:
            mismatch_count += 1
            mismatched_actors.append(manifest_path.stem.replace('_manifest', ''))
            
            if args.fix:
                fixed_count += 1
    
    # Print summary
    logger.info("="*80)
    logger.info("CLEANUP SUMMARY")
    logger.info("="*80)
    logger.info(f"Total manifests checked: {total_count}")
    logger.info(f"Mismatched base images: {mismatch_count}")
    
    if args.fix:
        logger.info(f"Cleaned up: {fixed_count}")
    
    if mismatched_actors:
        logger.info(f"\nAffected actor IDs: {', '.join(mismatched_actors)}")
    
    if mismatch_count > 0 and not args.fix:
        logger.info("")
        logger.info("Run with --fix to delete mismatched base images and training data from S3")
    
    logger.info("="*80)
    
    sys.exit(0)


if __name__ == '__main__':
    main()
