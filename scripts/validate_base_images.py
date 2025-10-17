#!/usr/bin/env python3
"""
Validate and regenerate base images for actors.

This script:
1. Goes through each actor
2. If no base image exists: creates one and deletes training data
3. If base image exists: uses GPT-4.1-mini vision to assess quality
   - Checks if image matches actor description and outfit
   - Checks if image is blurry/unrecognizable
4. If mismatch or blurry: recreates base image and deletes training data
5. If match and clear: skips to next actor

Usage:
    # Dry run on 10 random actors
    python scripts/validate_base_images.py --dry-run
    
    # Process all actors
    python scripts/validate_base_images.py
    
    # Process specific actors by ID
    python scripts/validate_base_images.py --actors 0,1,5,10
"""

import sys
import json
import os
import base64
import random
import argparse
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Add parent directory to path for imports
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Load .env file if it exists
try:
    from dotenv import load_dotenv
    env_path = project_root / '.env'
    if env_path.exists():
        load_dotenv(env_path)
        logger_msg = f"Loaded .env from {env_path}"
    else:
        logger_msg = f".env file not found at {env_path}"
except ImportError:
    # If dotenv not installed, try to manually load .env
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
        logger_msg = f"Manually loaded .env from {env_path} (python-dotenv not installed)"
    else:
        logger_msg = "python-dotenv not installed and .env file not found"

from src.utils.openai_client import OpenAIClient
from scripts.generate_base_image import generate_base_image
from scripts.delete_all_actor_training_data import delete_all_training_data

logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


def load_actors_data(project_root: Path) -> List[Dict]:
    """Load actors from actorsData.json"""
    actors_data_path = project_root / 'data' / 'actorsData.json'
    
    if not actors_data_path.exists():
        logger.error(f"actorsData.json not found at {actors_data_path}")
        return []
    
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
    Checks multiple possible locations.
    
    NOTE: Only checks base_image and poster_frame folders.
    Training images (_0, _1, etc.) should NOT be considered as base images.
    
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


def encode_image_to_base64(image_path: Path) -> str:
    """Encode image file to base64 string"""
    with open(image_path, 'rb') as f:
        image_data = f.read()
    return base64.b64encode(image_data).decode('utf-8')


def assess_base_image_with_gpt(
    image_path: Path,
    actor_description: str,
    outfit_description: str,
    gpt_client: OpenAIClient
) -> Tuple[bool, bool, str]:
    """
    Use GPT-4.1-mini vision to assess if base image matches description.
    
    Args:
        image_path: Path to base image
        actor_description: Actor's physical description
        outfit_description: Actor's outfit description
        gpt_client: GPT client instance
    
    Returns:
        Tuple of (is_match, is_clear, reason)
        - is_match: True if image matches descriptions closely enough
        - is_clear: True if image is clear and recognizable
        - reason: Explanation of the assessment
    """
    # Encode image to base64
    image_base64 = encode_image_to_base64(image_path)
    
    # Build assessment prompt - CRITICAL: Be lenient on matches to avoid deleting good images
    prompt = f"""You are assessing a base image for actor training. Your task is to determine:
1. Is the image CLEAR and RECOGNIZABLE (not blurry, not obscured)?
2. Does the image REASONABLY MATCH the actor description and outfit?

IMPORTANT MATCHING CRITERIA:
- Be LENIENT with matching - minor differences are acceptable
- Focus on MAJOR characteristics (age, sex, ethnicity, hair color/style)
- Outfit variations are acceptable as long as the style is similar
- Small details like exact clothing items can differ
- Lighting, pose, and angle variations are fine
- Only mark as NO MATCH if there are SIGNIFICANT differences (wrong age group, wrong sex, completely different appearance)

Actor Description: {actor_description}
Outfit Description: {outfit_description}

Assess the image and respond in JSON format:
{{
    "is_clear": true/false,
    "is_match": true/false,
    "clarity_reason": "Brief explanation of image clarity",
    "match_reason": "Brief explanation of match assessment",
    "confidence": "high/medium/low"
}}

Remember: Be LENIENT on matching. Only reject if there are MAJOR discrepancies."""

    try:
        # Call GPT-4.1-mini vision
        response = gpt_client.vision_completion(
            prompt=prompt,
            image_base64=image_base64,
            model="gpt-4.1-mini",
            json_mode=True  # Request JSON response
        )
        
        # Response is already a dict when json_mode=True
        result = response if isinstance(response, dict) else json.loads(response)
        
        is_clear = result.get('is_clear', False)
        is_match = result.get('is_match', False)
        
        # Build comprehensive reason
        clarity = result.get('clarity_reason', 'No clarity assessment')
        match = result.get('match_reason', 'No match assessment')
        confidence = result.get('confidence', 'unknown')
        
        reason = f"Clarity: {clarity} | Match: {match} | Confidence: {confidence}"
        
        return is_clear, is_match, reason
        
    except Exception as e:
        logger.error(f"GPT vision assessment failed: {e}")
        # On error, assume image is OK to avoid accidentally deleting good images
        return True, True, f"Assessment failed (error: {str(e)}), assuming image is valid"


def process_actor(
    actor: Dict,
    project_root: Path,
    gpt_client: OpenAIClient,
    dry_run: bool = False
) -> Dict:
    """
    Process a single actor: validate or create base image.
    
    Returns:
        Dictionary with processing results
    """
    actor_id = actor.get('id')
    actor_name = actor.get('name')
    description = actor.get('description', '')
    outfit = actor.get('outfit', '')
    
    logger.info("="*80)
    logger.info(f"Processing Actor {actor_id}: {actor_name}")
    logger.info(f"Description: {description}")
    logger.info(f"Outfit: {outfit}")
    
    result = {
        'actor_id': actor_id,
        'actor_name': actor_name,
        'action': None,
        'reason': None,
        'success': False
    }
    
    # Check if base image exists
    base_image_path = find_base_image(actor_name, project_root)
    
    if not base_image_path:
        logger.info("❌ No base image found")
        result['action'] = 'create_base_image'
        result['reason'] = 'No base image exists'
        
        if not dry_run:
            # Create base image
            logger.info("Creating new base image...")
            gen_result = generate_base_image(
                description=description,
                actor_name=actor_name,
                width=1024,
                height=1536,
                steps=25,
                seed=-1
            )
            
            if gen_result.get('status') == 'COMPLETED':
                logger.info("✅ Base image created successfully")
                
                # Delete all training data
                logger.info("Deleting all training data...")
                delete_result = delete_all_training_data(actor_name)
                
                if delete_result == 0:
                    logger.info("✅ Training data deleted successfully")
                    result['success'] = True
                else:
                    logger.warning("⚠️ Training data deletion had issues")
                    result['success'] = False
            else:
                logger.error(f"❌ Base image creation failed: {gen_result.get('error')}")
                result['success'] = False
        else:
            logger.info("[DRY RUN] Would create base image and delete training data")
            result['success'] = True
        
        return result
    
    # Base image exists - assess it with GPT vision
    logger.info(f"✓ Base image found: {base_image_path}")
    logger.info("Assessing image with GPT-4.1-mini vision...")
    
    is_clear, is_match, reason = assess_base_image_with_gpt(
        image_path=base_image_path,
        actor_description=description,
        outfit_description=outfit,
        gpt_client=gpt_client
    )
    
    logger.info(f"Assessment: Clear={is_clear}, Match={is_match}")
    logger.info(f"Reason: {reason}")
    
    # Determine if we need to recreate
    needs_recreation = (not is_clear) or (not is_match)
    
    if needs_recreation:
        if not is_clear:
            result['action'] = 'recreate_blurry'
            result['reason'] = f'Image is blurry/unrecognizable: {reason}'
        else:
            result['action'] = 'recreate_mismatch'
            result['reason'] = f'Image does not match description: {reason}'
        
        logger.warning(f"⚠️ Image needs recreation: {result['reason']}")
        
        if not dry_run:
            # Recreate base image
            logger.info("Recreating base image...")
            gen_result = generate_base_image(
                description=description,
                actor_name=actor_name,
                width=1024,
                height=1536,
                steps=25,
                seed=-1
            )
            
            if gen_result.get('status') == 'COMPLETED':
                logger.info("✅ Base image recreated successfully")
                
                # Delete all training data
                logger.info("Deleting all training data...")
                delete_result = delete_all_training_data(actor_name)
                
                if delete_result == 0:
                    logger.info("✅ Training data deleted successfully")
                    result['success'] = True
                else:
                    logger.warning("⚠️ Training data deletion had issues")
                    result['success'] = False
            else:
                logger.error(f"❌ Base image recreation failed: {gen_result.get('error')}")
                result['success'] = False
        else:
            logger.info("[DRY RUN] Would recreate base image and delete training data")
            result['success'] = True
    else:
        # Image is good - skip
        result['action'] = 'skip'
        result['reason'] = f'Image is clear and matches description: {reason}'
        result['success'] = True
        logger.info(f"✅ Image is valid - skipping")
    
    return result


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


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Validate and regenerate actor base images')
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Dry run mode: process 10 random actors without making changes'
    )
    parser.add_argument(
        '--actors',
        type=str,
        help='Comma-separated list of actor IDs to process (e.g., "0,1,5,10")'
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
    
    # Get project root
    project_root = Path(__file__).parent.parent
    
    # Checkpoint file path
    checkpoint_path = project_root / 'debug' / 'base_image_validation_checkpoint.json'
    checkpoint_path.parent.mkdir(exist_ok=True)
    
    # Handle checkpoint reset
    if args.reset_checkpoint:
        if checkpoint_path.exists():
            checkpoint_path.unlink()
            logger.info("Checkpoint deleted - starting fresh")
        else:
            logger.info("No checkpoint to delete")
    
    # Load checkpoint if resuming (works for both dry-run and real execution)
    processed_ids = set()
    if args.resume:
        processed_ids = load_checkpoint(checkpoint_path)
    
    # Load actors
    actors = load_actors_data(project_root)
    
    if not actors:
        logger.error("No actors loaded. Exiting.")
        sys.exit(1)
    
    # Filter actors if specific IDs provided
    if args.actors:
        actor_ids = [int(id.strip()) for id in args.actors.split(',')]
        actors = [a for a in actors if a.get('id') in actor_ids]
        logger.info(f"Processing {len(actors)} specific actors: {actor_ids}")
    elif args.dry_run:
        # Dry run mode
        if args.resume and processed_ids:
            # Resume dry run - skip already processed actors
            original_count = len(actors)
            actors = [a for a in actors if a.get('id') not in processed_ids]
            logger.info(f"DRY RUN RESUME MODE: Skipping {original_count - len(actors)} already processed actors")
            logger.info(f"Processing remaining {len(actors)} actors")
        else:
            # New dry run - process all actors (not just 10 random)
            logger.info(f"DRY RUN MODE: Processing all {len(actors)} actors")
    else:
        # Filter out already processed actors if resuming
        if args.resume and processed_ids:
            original_count = len(actors)
            actors = [a for a in actors if a.get('id') not in processed_ids]
            logger.info(f"RESUME MODE: Skipping {original_count - len(actors)} already processed actors")
            logger.info(f"Processing remaining {len(actors)} actors")
        else:
            logger.info(f"Processing ALL {len(actors)} actors")
    
    # Initialize OpenAI client
    try:
        gpt_client = OpenAIClient()
        logger.info("✓ OpenAI client initialized")
    except Exception as e:
        logger.error(f"Failed to initialize GPT client: {e}")
        sys.exit(1)
    
    # Process each actor
    results = []
    action_plan_path = project_root / 'debug' / 'base_image_validation_action_plan.json'
    
    for i, actor in enumerate(actors, 1):
        actor_id = actor.get('id')
        
        try:
            logger.info(f"[{i}/{len(actors)}] Processing actor {actor_id}...")
            result = process_actor(actor, project_root, gpt_client, dry_run=args.dry_run)
            results.append(result)
            
            # Add to processed set and save checkpoint (works for both dry-run and real execution)
            processed_ids.add(actor_id)
            save_checkpoint(checkpoint_path, processed_ids)
            
            # Save action plan after each actor (dry-run mode only)
            if args.dry_run:
                actions_needed = [r for r in results if r['action'] != 'skip' and r['action'] != 'error']
                with open(action_plan_path, 'w') as f:
                    json.dump({
                        'generated_at': str(Path(__file__).parent.parent),
                        'total_actors_checked': len(results),
                        'actions_needed': len(actions_needed),
                        'actions': actions_needed,
                        'summary': {
                            'create_base_image': sum(1 for r in actions_needed if r['action'] == 'create_base_image'),
                            'recreate_blurry': sum(1 for r in actions_needed if r['action'] == 'recreate_blurry'),
                            'recreate_mismatch': sum(1 for r in actions_needed if r['action'] == 'recreate_mismatch')
                        }
                    }, f, indent=2)
                
        except KeyboardInterrupt:
            logger.warning("\n⚠️  Interrupted by user")
            logger.info(f"Progress saved: {len(processed_ids)} actors processed")
            
            if args.dry_run:
                # Show action plan info
                actions_needed = [r for r in results if r['action'] != 'skip' and r['action'] != 'error']
                logger.info(f"Action plan saved: {len(actions_needed)} actors need attention")
                logger.info(f"  Location: {action_plan_path}")
                logger.info(f"Resume with: python scripts/validate_base_images.py --dry-run --resume")
            else:
                logger.info(f"Resume with: python scripts/validate_base_images.py --resume")
            sys.exit(130)
            
        except Exception as e:
            logger.error(f"Error processing actor {actor.get('name')}: {e}")
            results.append({
                'actor_id': actor_id,
                'actor_name': actor.get('name'),
                'action': 'error',
                'reason': str(e),
                'success': False
            })
            
            # Still mark as processed to avoid retrying failed actors
            processed_ids.add(actor_id)
            save_checkpoint(checkpoint_path, processed_ids)
    
    # Print summary
    logger.info("="*80)
    logger.info("VALIDATION SUMMARY")
    logger.info("="*80)
    
    skipped = sum(1 for r in results if r['action'] == 'skip')
    created = sum(1 for r in results if r['action'] == 'create_base_image')
    recreated_blurry = sum(1 for r in results if r['action'] == 'recreate_blurry')
    recreated_mismatch = sum(1 for r in results if r['action'] == 'recreate_mismatch')
    errors = sum(1 for r in results if r['action'] == 'error')
    
    logger.info(f"Total actors processed: {len(results)}")
    logger.info(f"Skipped (valid images): {skipped}")
    logger.info(f"Created new base images: {created}")
    logger.info(f"Recreated (blurry): {recreated_blurry}")
    logger.info(f"Recreated (mismatch): {recreated_mismatch}")
    logger.info(f"Errors: {errors}")
    
    if args.dry_run:
        logger.info("\n[DRY RUN] No changes were made")
        
        # Save action plan for dry run
        action_plan_path = project_root / 'debug' / 'base_image_validation_action_plan.json'
        actions_needed = [r for r in results if r['action'] != 'skip' and r['action'] != 'error']
        
        with open(action_plan_path, 'w') as f:
            json.dump({
                'generated_at': str(Path(__file__).parent.parent),
                'total_actors_checked': len(results),
                'actions_needed': len(actions_needed),
                'actions': actions_needed,
                'summary': {
                    'create_base_image': sum(1 for r in actions_needed if r['action'] == 'create_base_image'),
                    'recreate_blurry': sum(1 for r in actions_needed if r['action'] == 'recreate_blurry'),
                    'recreate_mismatch': sum(1 for r in actions_needed if r['action'] == 'recreate_mismatch')
                }
            }, f, indent=2)
        
        logger.info(f"\n📋 Action plan saved to: {action_plan_path}")
        logger.info(f"   {len(actions_needed)} actors need attention")
        logger.info(f"   Execute with: python scripts/execute_validation_plan.py")
    else:
        logger.info(f"\nTotal actors processed in this session: {len(results)}")
        logger.info(f"Total actors processed overall: {len(processed_ids)}")
        if args.resume:
            logger.info(f"Checkpoint saved to: {checkpoint_path}")
    
    # Save detailed results to file
    results_path = project_root / 'debug' / 'base_image_validation_results.json'
    results_path.parent.mkdir(exist_ok=True)
    
    with open(results_path, 'w') as f:
        json.dump({
            'dry_run': args.dry_run,
            'resumed': args.resume,
            'total_processed_this_session': len(results),
            'total_processed_overall': len(processed_ids),
            'summary': {
                'skipped': skipped,
                'created': created,
                'recreated_blurry': recreated_blurry,
                'recreated_mismatch': recreated_mismatch,
                'errors': errors
            },
            'results': results
        }, f, indent=2)
    
    logger.info(f"\nDetailed results saved to: {results_path}")
    
    # Show resume instructions if not all actors processed
    if len(actors) > 0:
        total_actors = len(load_actors_data(project_root))
        if len(processed_ids) < total_actors:
            remaining = total_actors - len(processed_ids)
            logger.info(f"\n💡 {remaining} actors remaining. Resume with:")
            if args.dry_run:
                logger.info(f"   python scripts/validate_base_images.py --dry-run --resume")
            else:
                logger.info(f"   python scripts/validate_base_images.py --resume")
    
    logger.info("="*80)
    
    # Exit with appropriate code
    sys.exit(0 if errors == 0 else 1)


if __name__ == "__main__":
    main()
