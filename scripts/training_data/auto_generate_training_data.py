#!/usr/bin/env python3
"""
Automatically generate training data for actors with no training data.
Uses existing generate_single_training_image_s3.py to create images with:
- 60% photorealistic prompts
- 20% B&W stylized prompts  
- 20% color stylized prompts
- Random aspect ratio (1:1 or 16:9)

This script:
1. Loads all actors from actorsData.json
2. Checks actor manifests to find actors with no training data
3. Generates training images using existing code
4. Properly handles S3 upload and manifest updates
"""

import sys
import os
import json
import logging
import random
from pathlib import Path
from typing import List, Dict, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from src.actor_training_prompts import get_actor_training_prompts, get_actor_descriptor

# Import the function directly by loading the module
import importlib.util
spec = importlib.util.spec_from_file_location(
    "generate_single_training_image_s3",
    project_root / "scripts" / "training_data" / "generate_single_training_image_s3.py"
)
generate_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generate_module)
generate_single_training_image_s3 = generate_module.generate_single_training_image_s3

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def load_actors() -> List[Dict]:
    """Load all actors from actorsData.json."""
    actors_file = project_root / "data" / "actorsData.json"
    
    if not actors_file.exists():
        logger.error(f"Actors file not found: {actors_file}")
        return []
    
    with open(actors_file, 'r') as f:
        actors = json.load(f)
    
    logger.info(f"Loaded {len(actors)} actors from actorsData.json")
    return actors


def get_actor_training_count(actor_id: str) -> int:
    """
    Get the number of training images for an actor from their manifest.
    
    Args:
        actor_id: Actor ID (e.g., "0", "12", "123")
        
    Returns:
        Number of training images, or 0 if manifest doesn't exist
    """
    manifest_path = project_root / "data" / "actor_manifests" / f"{str(actor_id).zfill(4)}_manifest.json"
    
    if not manifest_path.exists():
        return 0
    
    try:
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
        
        training_data = manifest.get("training_data", [])
        return len(training_data)
        
    except Exception as e:
        logger.warning(f"Failed to read manifest for actor {actor_id}: {e}")
        return 0


def get_base_image_url(actor: Dict) -> Optional[str]:
    """
    Get the base image URL for an actor from their manifest.
    
    Args:
        actor: Actor dictionary from actorsData.json
        
    Returns:
        S3 URL of base image, or None if not found
    """
    actor_id = str(actor['id']).zfill(4)
    manifest_path = project_root / "data" / "actor_manifests" / f"{actor_id}_manifest.json"
    
    if not manifest_path.exists():
        logger.warning(f"Manifest not found for actor {actor_id}")
        return None
    
    try:
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
        
        # Check for base images array
        base_images = manifest.get("base_images", [])
        if base_images and len(base_images) > 0:
            # Use accelerated URL if available, otherwise standard
            base_image = base_images[0]
            return base_image.get("s3_accelerated_url") or base_image.get("s3_url")
        
        logger.warning(f"No base image found in manifest for actor {actor_id}")
        return None
        
    except Exception as e:
        logger.error(f"Failed to read manifest for actor {actor_id}: {e}")
        return None


def select_prompts_by_distribution(all_prompts: List[str], total_images: int = 15) -> List[str]:
    """
    Select prompts following the 60/20/20 distribution.
    
    Args:
        all_prompts: List of all available prompts (15 photo + 11 bw + 9 color = 35 total)
        total_images: Total number of images to generate (default: 15)
        
    Returns:
        List of selected prompts
    """
    # Split prompts by category (based on get_actor_training_prompts structure)
    photorealistic = all_prompts[0:15]   # First 15 are photorealistic
    bw_stylized = all_prompts[15:26]     # Next 11 are B&W stylized
    color_stylized = all_prompts[26:35]  # Last 9 are color stylized
    
    # Calculate counts based on distribution
    photo_count = int(total_images * 0.6)  # 60%
    bw_count = int(total_images * 0.2)     # 20%
    color_count = total_images - photo_count - bw_count  # Remaining (20%)
    
    logger.info(f"Distribution: {photo_count} photorealistic, {bw_count} B&W, {color_count} color")
    
    # Randomly select from each category
    selected = []
    selected.extend(random.sample(photorealistic, min(photo_count, len(photorealistic))))
    selected.extend(random.sample(bw_stylized, min(bw_count, len(bw_stylized))))
    selected.extend(random.sample(color_stylized, min(color_count, len(color_stylized))))
    
    # Shuffle to randomize order
    random.shuffle(selected)
    
    return selected


def generate_single_image_task(
    actor_id: str,
    actor_name: str,
    base_image_url: str,
    prompt: str,
    actor_type: str,
    actor_sex: str,
    aspect_ratio: str,
    image_num: int,
    total_images: int
) -> Dict:
    """
    Task function for generating a single image (used in parallel execution).
    
    Returns:
        Dict with success status and metadata
    """
    logger.info(f"\n--- Image {image_num}/{total_images} ---")
    logger.info(f"Aspect ratio: {aspect_ratio}")
    logger.info(f"Prompt preview: {prompt[:100]}...")
    
    try:
        result = generate_single_training_image_s3(
            actor_id=actor_id,
            actor_name=actor_name,
            base_image_url=base_image_url,
            prompt=prompt,
            actor_type=actor_type,
            actor_sex=actor_sex,
            aspect_ratio=aspect_ratio
        )
        
        if result.get("success"):
            logger.info(f"✅ Generated: {result.get('filename')}")
            return {"success": True, "filename": result.get('filename')}
        else:
            logger.error(f"❌ Failed: {result.get('error')}")
            return {"success": False, "error": result.get('error')}
            
    except Exception as e:
        logger.error(f"❌ Exception during generation: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


def generate_training_data_for_actor(
    actor: Dict,
    total_images: int = 15,
    dry_run: bool = False,
    max_workers: int = 2
) -> Dict:
    """
    Generate training data for a single actor.
    
    Args:
        actor: Actor dictionary from actorsData.json
        total_images: Number of images to generate (default: 15)
        dry_run: If True, only simulate without generating
        
    Returns:
        Dictionary with generation results
    """
    actor_id = str(actor['id']).zfill(4)
    actor_name = actor['name']
    
    logger.info(f"\n{'='*60}")
    logger.info(f"Processing actor: {actor_name} (ID: {actor_id})")
    logger.info(f"{'='*60}")
    
    # Get base image URL
    base_image_url = get_base_image_url(actor)
    if not base_image_url:
        logger.error(f"❌ No base image found for {actor_name}, skipping")
        return {
            "actor_id": actor_id,
            "actor_name": actor_name,
            "success": False,
            "error": "No base image found",
            "generated": 0
        }
    
    logger.info(f"✓ Base image URL: {base_image_url[:80]}...")
    
    # Get actor descriptor and prompts
    actor_type = actor.get('type', 'human').lower()
    actor_sex = actor.get('sex', '').lower()
    generic_descriptor = get_actor_descriptor(actor_type, actor_sex)
    
    # Build full character description with outfit (same as UI does)
    full_character_description = actor.get('description', generic_descriptor)
    if actor.get('outfit'):
        full_character_description = f"{full_character_description}, wearing {actor['outfit']}"
    
    logger.info(f"✓ Generic descriptor: {generic_descriptor}")
    logger.info(f"✓ Full character description: {full_character_description}")
    
    # Get all available prompts with generic descriptor
    all_prompts = get_actor_training_prompts(generic_descriptor)
    logger.info(f"✓ Loaded {len(all_prompts)} available prompts")
    
    # Replace generic descriptor with full character description in all prompts
    # This matches what the UI does in handleGetPresetTrainingPrompts
    import re
    descriptor_pattern = re.compile(rf'\b(the|The)\s+({re.escape(generic_descriptor)})\b')
    customized_prompts = [
        descriptor_pattern.sub(full_character_description, prompt)
        for prompt in all_prompts
    ]
    
    # Select prompts by distribution
    selected_prompts = select_prompts_by_distribution(customized_prompts, total_images)
    logger.info(f"✓ Selected {len(selected_prompts)} prompts for generation")
    
    if dry_run:
        logger.info(f"🔍 DRY RUN: Would generate {len(selected_prompts)} images")
        return {
            "actor_id": actor_id,
            "actor_name": actor_name,
            "success": True,
            "dry_run": True,
            "would_generate": len(selected_prompts)
        }
    
    # Generate images in parallel
    success_count = 0
    failed_count = 0
    
    # Prepare tasks with random aspect ratios
    tasks = []
    for i, prompt in enumerate(selected_prompts, 1):
        aspect_ratio = random.choice(["1:1", "16:9"])
        tasks.append({
            "actor_id": actor_id,
            "actor_name": actor_name,
            "base_image_url": base_image_url,
            "prompt": prompt,
            "actor_type": actor_type,
            "actor_sex": actor_sex,
            "aspect_ratio": aspect_ratio,
            "image_num": i,
            "total_images": len(selected_prompts)
        })
    
    logger.info(f"\n🚀 Starting parallel generation with {max_workers} workers...")
    
    # Execute tasks in parallel
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks
        future_to_task = {
            executor.submit(generate_single_image_task, **task): task
            for task in tasks
        }
        
        # Process completed tasks as they finish
        for future in as_completed(future_to_task):
            task = future_to_task[future]
            try:
                result = future.result()
                if result.get("success"):
                    success_count += 1
                else:
                    failed_count += 1
            except Exception as e:
                failed_count += 1
                logger.error(f"❌ Task exception: {e}", exc_info=True)
    
    logger.info(f"\n{'='*60}")
    logger.info(f"Completed {actor_name}: {success_count} success, {failed_count} failed")
    logger.info(f"{'='*60}\n")
    
    return {
        "actor_id": actor_id,
        "actor_name": actor_name,
        "success": True,
        "generated": success_count,
        "failed": failed_count
    }


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Automatically generate training data for actors with no training data"
    )
    parser.add_argument(
        '--count',
        type=int,
        default=15,
        help='Number of images to generate per actor (default: 15)'
    )
    parser.add_argument(
        '--max-actors',
        type=int,
        default=None,
        help='Maximum number of actors to process (default: all)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Simulate without actually generating images'
    )
    parser.add_argument(
        '--actor-id',
        type=str,
        default=None,
        help='Process only a specific actor ID (e.g., "0012")'
    )
    parser.add_argument(
        '--workers',
        type=int,
        default=2,
        help='Number of parallel workers for Replicate requests (default: 2)'
    )
    
    args = parser.parse_args()
    
    logger.info("="*60)
    logger.info("AUTO TRAINING DATA GENERATOR")
    logger.info("="*60)
    logger.info(f"Images per actor: {args.count}")
    logger.info(f"Distribution: 60% photo, 20% B&W, 20% color")
    logger.info(f"Aspect ratios: Random 1:1 or 16:9")
    logger.info(f"Parallel workers: {args.workers}")
    logger.info(f"Dry run: {args.dry_run}")
    logger.info("="*60)
    
    # Load all actors
    actors = load_actors()
    if not actors:
        logger.error("No actors found, exiting")
        sys.exit(1)
    
    # Filter actors with no training data
    actors_to_process = []
    
    for actor in actors:
        actor_id = str(actor['id'])
        
        # If specific actor ID requested, only process that one
        if args.actor_id:
            if actor_id.zfill(4) != args.actor_id.zfill(4):
                continue
        
        training_count = get_actor_training_count(actor_id)
        
        if training_count == 0:
            actors_to_process.append(actor)
            logger.info(f"✓ {actor['name']} (ID: {actor_id}) - No training data")
        else:
            logger.debug(f"⊘ {actor['name']} (ID: {actor_id}) - Has {training_count} images, skipping")
    
    if not actors_to_process:
        logger.info("\n✅ No actors found with zero training data!")
        sys.exit(0)
    
    logger.info(f"\n📋 Found {len(actors_to_process)} actors with no training data")
    
    # Apply max actors limit if specified
    if args.max_actors and len(actors_to_process) > args.max_actors:
        logger.info(f"⚠️  Limiting to first {args.max_actors} actors")
        actors_to_process = actors_to_process[:args.max_actors]
    
    # Process each actor
    results = []
    
    for i, actor in enumerate(actors_to_process, 1):
        logger.info(f"\n{'#'*60}")
        logger.info(f"ACTOR {i}/{len(actors_to_process)}")
        logger.info(f"{'#'*60}")
        
        result = generate_training_data_for_actor(
            actor=actor,
            total_images=args.count,
            dry_run=args.dry_run,
            max_workers=args.workers
        )
        results.append(result)
    
    # Summary
    logger.info("\n" + "="*60)
    logger.info("SUMMARY")
    logger.info("="*60)
    
    total_generated = sum(r.get('generated', 0) for r in results)
    total_failed = sum(r.get('failed', 0) for r in results)
    
    for result in results:
        status = "✅" if result.get('success') else "❌"
        if result.get('dry_run'):
            logger.info(f"{status} {result['actor_name']}: Would generate {result.get('would_generate', 0)} images")
        else:
            logger.info(f"{status} {result['actor_name']}: {result.get('generated', 0)} generated, {result.get('failed', 0)} failed")
    
    logger.info(f"\nTotal: {total_generated} images generated, {total_failed} failed")
    logger.info("="*60)


if __name__ == "__main__":
    main()
