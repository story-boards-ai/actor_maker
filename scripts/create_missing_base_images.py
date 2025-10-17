#!/usr/bin/env python3
"""
Create base images for actors that don't have one.

This script:
1. Checks all actors for base images (only in base_image/ and poster_frame/ folders)
2. For actors without base images, generates new ones
3. Does NOT validate or recreate existing base images
4. Supports checkpoint/resume functionality

Usage:
    # Dry run - see which actors need base images
    python scripts/create_missing_base_images.py --dry-run
    
    # Create base images for all actors without one
    python scripts/create_missing_base_images.py
    
    # Resume if interrupted
    python scripts/create_missing_base_images.py --resume
    
    # Reset checkpoint and start fresh
    python scripts/create_missing_base_images.py --reset-checkpoint
"""

import sys
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional

# Add parent directory to path for imports
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Load .env file if it exists
try:
    from dotenv import load_dotenv
    env_path = project_root / '.env'
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    # If dotenv not installed, try to manually load .env
    import os
    env_path = project_root / '.env'
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    # Remove quotes if present
                    value = value.strip().strip('"').strip("'")
                    os.environ[key.strip()] = value

from src.utils.image_processing import base64_to_image
from scripts.generate_base_image import generate_base_image
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


def load_checkpoint(checkpoint_path: Path) -> set:
    """Load processed actor IDs from checkpoint file"""
    if checkpoint_path.exists():
        try:
            with open(checkpoint_path, 'r') as f:
                data = json.load(f)
                processed_ids = set(data.get('processed_actor_ids', []))
                logger.info(f"Loaded checkpoint: {len(processed_ids)} actors already processed")
                return processed_ids
        except Exception as e:
            logger.warning(f"Failed to load checkpoint: {e}")
    return set()


def save_checkpoint(checkpoint_path: Path, processed_ids: set) -> None:
    """Save processed actor IDs to checkpoint file"""
    try:
        with open(checkpoint_path, 'w') as f:
            json.dump({
                'processed_actor_ids': list(processed_ids),
                'last_updated': str(Path(__file__).parent.parent)
            }, f, indent=2)
    except Exception as e:
        logger.warning(f"Failed to save checkpoint: {e}")


def create_base_image_for_actor(
    actor: Dict,
    project_root: Path,
    dry_run: bool = False
) -> Dict:
    """
    Create base image for an actor.
    
    Returns:
        Dictionary with processing results
    """
    actor_id = actor.get('id')
    actor_name = actor.get('name')
    description = actor.get('description', '')
    outfit = actor.get('outfit', '')
    
    result = {
        'actor_id': actor_id,
        'actor_name': actor_name,
        'success': False,
        'message': ''
    }
    
    if dry_run:
        result['success'] = True
        result['message'] = '[DRY RUN] Would create base image'
        return result
    
    try:
        # Step 1: Delete training data
        logger.info("  → Deleting training data...")
        delete_result = delete_all_training_data(actor_name)
        if delete_result != 0:
            logger.warning("  ⚠️  Training data deletion had issues")
        
        # Step 2: Generate base image
        logger.info("  → Generating base image...")
        gen_result = generate_base_image(
            description=description,
            actor_name=actor_name,
            outfit=outfit,
            width=1024,
            height=1536,
            steps=25,
            seed=-1
        )
        
        if gen_result.get('status') == 'COMPLETED':
            # Extract and save the image
            images = gen_result.get('output', {}).get('output', {}).get('images', [])
            if not images:
                result['message'] = 'No images in result'
                return result
            
            # Convert base64 to PIL Image
            base64_image = images[0]
            pil_image = base64_to_image(base64_image)
            
            # Save to base_image directory
            actor_dir = project_root / 'data' / 'actors' / actor_name
            base_image_dir = actor_dir / 'base_image'
            base_image_dir.mkdir(parents=True, exist_ok=True)
            
            # Save as JPG
            output_path = base_image_dir / f"{actor_name}_base.jpg"
            pil_image.save(output_path, 'JPEG', quality=95)
            
            logger.info(f"  → Saved to: {output_path}")
            logger.info("  ✅ Success")
            
            result['success'] = True
            result['message'] = f'Created base image: {output_path}'
            return result
        else:
            result['message'] = f"Generation failed: {gen_result.get('error')}"
            return result
            
    except Exception as e:
        result['message'] = f'Error: {str(e)}'
        return result


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Create base images for actors without one'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview which actors need base images without creating them'
    )
    parser.add_argument(
        '--resume',
        action='store_true',
        help='Resume from checkpoint (skip already processed actors)'
    )
    parser.add_argument(
        '--reset-checkpoint',
        action='store_true',
        help='Delete checkpoint and start fresh'
    )
    
    args = parser.parse_args()
    
    # Checkpoint file path
    checkpoint_path = project_root / 'debug' / 'create_base_images_checkpoint.json'
    checkpoint_path.parent.mkdir(exist_ok=True)
    
    # Handle checkpoint reset
    if args.reset_checkpoint:
        if checkpoint_path.exists():
            checkpoint_path.unlink()
            logger.info("Checkpoint deleted - starting fresh")
        else:
            logger.info("No checkpoint to delete")
        sys.exit(0)
    
    # Load checkpoint if resuming
    processed_ids = set()
    if args.resume:
        processed_ids = load_checkpoint(checkpoint_path)
    
    logger.info("="*80)
    if args.dry_run:
        logger.info("DRY RUN MODE - No base images will be created")
    else:
        logger.info("CREATE MODE - Base images will be generated")
    logger.info("="*80)
    logger.info("")
    
    # Load actors
    actors = load_actors_data(project_root)
    
    if not actors:
        logger.error("No actors loaded. Exiting.")
        sys.exit(1)
    
    # Filter out already processed actors if resuming
    if args.resume and processed_ids:
        original_count = len(actors)
        actors = [a for a in actors if a.get('id') not in processed_ids]
        logger.info(f"RESUME MODE: Skipping {original_count - len(actors)} already processed actors")
        logger.info(f"Processing remaining {len(actors)} actors")
        logger.info("")
    
    # Find actors without base images
    actors_without_base_image = []
    
    logger.info("Scanning actors for missing base images...")
    logger.info("")
    
    for actor in actors:
        actor_id = actor.get('id')
        actor_name = actor.get('name')
        
        # Check for base image
        base_image_path = find_base_image(actor_name, project_root)
        
        if not base_image_path:
            actors_without_base_image.append(actor)
            logger.info(f"❌ Actor {actor_id} ({actor_name}): No base image")
        else:
            logger.info(f"✅ Actor {actor_id} ({actor_name}): Has base image - skipping")
            # Mark as processed even if skipped
            processed_ids.add(actor_id)
            save_checkpoint(checkpoint_path, processed_ids)
    
    # Summary
    logger.info("")
    logger.info("="*80)
    logger.info("SCAN SUMMARY")
    logger.info("="*80)
    logger.info(f"Total actors scanned: {len(actors)}")
    logger.info(f"Actors with base images: {len(actors) - len(actors_without_base_image)}")
    logger.info(f"Actors needing base images: {len(actors_without_base_image)}")
    logger.info("")
    
    if not actors_without_base_image:
        logger.info("✅ All actors have base images!")
        sys.exit(0)
    
    # Create base images
    if args.dry_run:
        logger.info("[DRY RUN] Would create base images for these actors:")
        for actor in actors_without_base_image:
            logger.info(f"  - {actor['name']} (ID: {actor['id']})")
        logger.info("")
        logger.info("Run without --dry-run to actually create the base images")
    else:
        logger.info("="*80)
        logger.info("CREATING BASE IMAGES")
        logger.info("="*80)
        logger.info("")
        
        results = []
        for i, actor in enumerate(actors_without_base_image, 1):
            actor_id = actor['id']
            actor_name = actor['name']
            
            try:
                logger.info(f"[{i}/{len(actors_without_base_image)}] Processing actor {actor_id} ({actor_name})...")
                
                result = create_base_image_for_actor(actor, project_root, dry_run=False)
                results.append(result)
                
                # Mark as processed and save checkpoint
                processed_ids.add(actor_id)
                save_checkpoint(checkpoint_path, processed_ids)
                logger.info("")
                
            except KeyboardInterrupt:
                logger.warning("\n⚠️  Interrupted by user")
                logger.info(f"Progress saved: {len(processed_ids)} actors processed")
                logger.info(f"Resume with: python scripts/create_missing_base_images.py --resume")
                sys.exit(130)
                
            except Exception as e:
                logger.error(f"  ❌ Unexpected error: {e}")
                results.append({
                    'actor_id': actor_id,
                    'actor_name': actor_name,
                    'success': False,
                    'message': str(e)
                })
                # Still mark as processed to avoid retrying
                processed_ids.add(actor_id)
                save_checkpoint(checkpoint_path, processed_ids)
                logger.info("")
        
        # Final summary
        logger.info("="*80)
        logger.info("CREATION SUMMARY")
        logger.info("="*80)
        
        successful = sum(1 for r in results if r['success'])
        failed = sum(1 for r in results if not r['success'])
        
        logger.info(f"Total processed: {len(results)}")
        logger.info(f"Successful: {successful}")
        logger.info(f"Failed: {failed}")
        
        # Save results
        results_path = project_root / 'debug' / 'create_base_images_results.json'
        
        with open(results_path, 'w') as f:
            json.dump({
                'total_actors': len(actors),
                'actors_needing_base_images': len(actors_without_base_image),
                'successful': successful,
                'failed': failed,
                'results': results
            }, f, indent=2)
        
        logger.info(f"\nResults saved to: {results_path}")
        logger.info("="*80)
        
        sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
