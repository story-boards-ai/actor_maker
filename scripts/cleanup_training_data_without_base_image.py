#!/usr/bin/env python3
"""
Delete training data for actors that don't have a base image.

This script:
1. Checks all actors for base images (only in base_image/ and poster_frame/ folders)
2. For actors without base images, deletes their training data
3. Provides dry-run mode to preview what will be deleted

Usage:
    # Dry run - see what would be deleted
    python scripts/cleanup_training_data_without_base_image.py --dry-run
    
    # Actually delete training data
    python scripts/cleanup_training_data_without_base_image.py
"""

import sys
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional

# Add parent directory to path for imports
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from scripts.delete_all_actor_training_data import delete_all_training_data

logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


def load_actors_data(project_root: Path) -> List[Dict]:
    """Load actors data from actorsData.json"""
    actors_data_path = project_root / 'data' / 'actorsData.json'
    
    try:
        with open(actors_data_path, 'r') as f:
            actors = json.load(f)
        logger.info(f"Loaded {len(actors)} actors from actorsData.json")
        return actors
    except Exception as e:
        logger.error(f"Failed to load actorsData.json: {e}")
        return []


def find_base_image(actor_name: str, project_root: Path) -> Optional[Path]:
    """
    Find base image for an actor.
    Only checks base_image and poster_frame folders.
    Training images are NOT considered as base images.
    
    Returns:
        Path to base image if found, None otherwise
    """
    possible_paths = [
        # base_image folder (preferred)
        project_root / 'data' / 'actors' / actor_name / 'base_image' / f'{actor_name}_base.jpg',
        project_root / 'data' / 'actors' / actor_name / 'base_image' / f'{actor_name}_base.png',
        # poster_frame folder
        project_root / 'data' / 'actors' / actor_name / 'poster_frame' / f'{actor_name}_poster.png',
        project_root / 'data' / 'actors' / actor_name / 'poster_frame' / f'{actor_name}_poster.jpg',
    ]
    
    for path in possible_paths:
        if path.exists():
            return path
    
    return None


def check_training_data_exists(actor_name: str, project_root: Path) -> bool:
    """Check if actor has any training data"""
    training_dir = project_root / 'data' / 'actors' / actor_name / 'training_data'
    
    if not training_dir.exists():
        return False
    
    # Check for image files
    image_files = list(training_dir.glob('*.jpg')) + list(training_dir.glob('*.png'))
    return len(image_files) > 0


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Delete training data for actors without base images'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview what will be deleted without making changes'
    )
    
    args = parser.parse_args()
    
    logger.info("="*80)
    if args.dry_run:
        logger.info("DRY RUN MODE - No changes will be made")
    else:
        logger.info("CLEANUP MODE - Training data will be deleted")
    logger.info("="*80)
    logger.info("")
    
    # Load actors
    actors = load_actors_data(project_root)
    
    if not actors:
        logger.error("No actors loaded. Exiting.")
        sys.exit(1)
    
    # Find actors without base images
    actors_without_base_image = []
    actors_with_training_data = []
    
    logger.info("Scanning actors for base images...")
    logger.info("")
    
    for actor in actors:
        actor_id = actor.get('id')
        actor_name = actor.get('name')
        
        # Check for base image
        base_image_path = find_base_image(actor_name, project_root)
        
        if not base_image_path:
            actors_without_base_image.append(actor)
            
            # Check if they have training data
            has_training_data = check_training_data_exists(actor_name, project_root)
            if has_training_data:
                actors_with_training_data.append(actor)
                logger.info(f"❌ Actor {actor_id} ({actor_name}): No base image, has training data")
            else:
                logger.info(f"⚠️  Actor {actor_id} ({actor_name}): No base image, no training data")
        else:
            logger.info(f"✅ Actor {actor_id} ({actor_name}): Has base image")
    
    # Summary
    logger.info("")
    logger.info("="*80)
    logger.info("SCAN SUMMARY")
    logger.info("="*80)
    logger.info(f"Total actors: {len(actors)}")
    logger.info(f"Actors without base images: {len(actors_without_base_image)}")
    logger.info(f"Actors with training data to delete: {len(actors_with_training_data)}")
    logger.info("")
    
    if not actors_with_training_data:
        logger.info("✅ No training data to delete!")
        sys.exit(0)
    
    # Delete training data
    if args.dry_run:
        logger.info("[DRY RUN] Would delete training data for these actors:")
        for actor in actors_with_training_data:
            logger.info(f"  - {actor['name']} (ID: {actor['id']})")
        logger.info("")
        logger.info("Run without --dry-run to actually delete the training data")
    else:
        logger.info("="*80)
        logger.info("DELETING TRAINING DATA")
        logger.info("="*80)
        logger.info("")
        
        results = []
        for i, actor in enumerate(actors_with_training_data, 1):
            actor_name = actor['name']
            actor_id = actor['id']
            
            logger.info(f"[{i}/{len(actors_with_training_data)}] Deleting training data for {actor_name}...")
            
            try:
                result = delete_all_training_data(actor_name)
                success = result == 0
                results.append({
                    'actor_id': actor_id,
                    'actor_name': actor_name,
                    'success': success
                })
                
                if success:
                    logger.info("  ✅ Success")
                else:
                    logger.info("  ⚠️  Completed with warnings")
                    
            except Exception as e:
                logger.error(f"  ❌ Error: {e}")
                results.append({
                    'actor_id': actor_id,
                    'actor_name': actor_name,
                    'success': False
                })
            
            logger.info("")
        
        # Final summary
        logger.info("="*80)
        logger.info("DELETION SUMMARY")
        logger.info("="*80)
        
        successful = sum(1 for r in results if r['success'])
        failed = sum(1 for r in results if not r['success'])
        
        logger.info(f"Total processed: {len(results)}")
        logger.info(f"Successful: {successful}")
        logger.info(f"Failed: {failed}")
        
        # Save results
        results_path = project_root / 'debug' / 'training_data_cleanup_results.json'
        results_path.parent.mkdir(exist_ok=True)
        
        with open(results_path, 'w') as f:
            json.dump({
                'total_actors': len(actors),
                'actors_without_base_image': len(actors_without_base_image),
                'training_data_deleted': len(results),
                'successful': successful,
                'failed': failed,
                'results': results
            }, f, indent=2)
        
        logger.info(f"\nResults saved to: {results_path}")
        logger.info("="*80)
        
        sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
