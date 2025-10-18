#!/usr/bin/env python3
"""
Batch generate base images for multiple actors.

This script:
1. Reads actor data from actorsData.json
2. Generates base images for specified actor IDs
3. Uploads to S3 and updates manifests

Usage:
    python scripts/batch_generate_base_images.py
"""

import os
import sys
import json
import logging
import time
from pathlib import Path
from typing import List, Dict, Any

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.runpod.serverless import RunPodServerlessClient
from src.workflows_lib.workflow_builder import WorkflowBuilder
from src.utils.s3 import S3Client
from PIL import Image
import io

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Actor IDs to process (extracted from your log)
ACTOR_IDS = [
    207, 208, 215, 222, 225, 228, 231, 235, 236, 237, 238, 239, 240, 241, 242, 243,
    261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276,
    277, 278, 279, 280, 281, 282, 283, 284, 285, 286, 287
]


def load_actors_data() -> List[Dict[str, Any]]:
    """Load actors data from JSON file."""
    actors_file = project_root / "data" / "actorsData.json"
    
    if not actors_file.exists():
        logger.error(f"actorsData.json not found: {actors_file}")
        sys.exit(1)
    
    with open(actors_file, 'r') as f:
        return json.load(f)


def find_actor_by_id(actors: List[Dict], actor_id: int) -> Dict[str, Any]:
    """Find actor by ID."""
    for actor in actors:
        if actor.get('id') == actor_id:
            return actor
    return None


def generate_base_image(actor: Dict[str, Any]) -> bytes:
    """
    Generate a base image for an actor.
    
    Args:
        actor: Actor data dictionary
        
    Returns:
        JPEG image bytes
    """
    actor_name = actor['name']
    description = actor.get('description') or actor.get('face_prompt', '')
    outfit = actor.get('outfit', '')
    
    logger.info(f"Generating base image for: {actor_name}")
    logger.info(f"Description: {description}")
    
    # Build the prompt
    character_desc = description
    if outfit:
        character_desc = f"{description}, wearing {outfit}"
    
    prompt = f"""Professional full-body studio portrait photograph of a {character_desc}.
Standing pose, facing camera, centered in frame.
Neutral gray or beige studio background with professional lighting.
Natural relaxed pose with arms at sides or casually positioned.
Sharp focus, high quality, photorealistic.
Full body visible from head to toe.
Direct eye contact with camera or slight angle.
Clean composition, no distracting elements."""
    
    # Initialize clients
    serverless_client = RunPodServerlessClient()
    workflow_builder = WorkflowBuilder()
    
    # Build workflow
    workflow_params = {
        "positive_prompt": prompt,
        "width": 1024,
        "height": 1536,
        "steps": 25,
        "seed": -1,
        "model": "flux1-dev-fp8",
        "sampler_name": "euler",
        "scheduler_name": "simple",
        "flux_guidance": 3.5,
        "batch_size": 1,
        "lora_name": None,
        "character_loras": None,
        "cine_lora_strength": 0.0
    }
    
    workflow = workflow_builder.build_workflow(**workflow_params)
    
    # Build RunPod payload
    payload = {
        "payload": {
            "input": {
                "workflow": workflow,
                "model_urls": [],
                "force_download": False
            }
        },
        "mode": "text-to-image"
    }
    
    # Generate image
    logger.info(f"Sending request to RunPod for {actor_name}...")
    result = serverless_client.generate_image(
        payload=payload["payload"],
        mode="wizard",
        request_id=f"base_{actor_name}"
    )
    
    if not result or result.get("status") != "COMPLETED":
        error = result.get("output", {}).get("error", "Unknown error") if result else "No response"
        raise Exception(f"Generation failed: {error}")
    
    # Extract image from response
    images = []
    output = result.get("output", {})
    
    # Try different possible locations
    if "output" in output and "images" in output["output"]:
        images = output["output"]["images"]
    elif "job_results" in output and "images" in output["job_results"]:
        images = output["job_results"]["images"]
    elif "images" in output:
        images = output["images"]
    
    if not images:
        raise Exception("No images found in response")
    
    # Get first image (base64 string)
    image_data = images[0]
    
    # Convert base64 to bytes if needed
    if image_data.startswith('data:image'):
        # Remove data URI prefix
        image_data = image_data.split(',', 1)[1]
    
    import base64
    image_bytes = base64.b64decode(image_data)
    
    # Convert to JPEG
    img = Image.open(io.BytesIO(image_bytes))
    if img.mode in ('RGBA', 'LA', 'P'):
        background = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
        img = background
    elif img.mode != 'RGB':
        img = img.convert('RGB')
    
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG', quality=95, optimize=True)
    jpeg_bytes = buffer.getvalue()
    
    logger.info(f"✓ Generated image: {len(jpeg_bytes) / 1024 / 1024:.2f} MB")
    return jpeg_bytes


def upload_to_s3(actor_name: str, jpeg_bytes: bytes) -> str:
    """Upload image to S3."""
    s3_client = S3Client()
    bucket = "story-boards-assets"
    s3_key = f"system_actors/base_images/{actor_name}_base.jpg"
    
    logger.info(f"Uploading to S3: s3://{bucket}/{s3_key}")
    
    result = s3_client.upload_image(
        image_data=jpeg_bytes,
        bucket=bucket,
        key=s3_key,
        extension='jpg'
    )
    
    s3_url = result['Location']
    logger.info(f"✓ Uploaded: {s3_url}")
    return s3_url


def update_manifest(actor_name: str, s3_url: str) -> bool:
    """Update manifest with S3 URL."""
    numeric_id = actor_name.split('_')[0]
    manifest_path = project_root / "data" / "actor_manifests" / f"{numeric_id}_manifest.json"
    
    if not manifest_path.exists():
        logger.warning(f"Manifest not found: {manifest_path}")
        return False
    
    with open(manifest_path, 'r') as f:
        manifest = json.load(f)
    
    manifest['base_images'] = [{
        'filename': f"{actor_name}_base.jpg",
        's3_url': s3_url,
        'status': 'synced',
        'format': 'jpeg'
    }]
    
    if 'statistics' not in manifest:
        manifest['statistics'] = {}
    manifest['statistics']['base_images_count'] = 1
    
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
    
    logger.info(f"✓ Manifest updated")
    return True


def process_actor(actor: Dict[str, Any]) -> bool:
    """Process a single actor."""
    actor_name = actor['name']
    actor_id = actor['id']
    
    logger.info("="*80)
    logger.info(f"Processing Actor {actor_id}: {actor_name}")
    logger.info("="*80)
    
    try:
        # Generate base image
        jpeg_bytes = generate_base_image(actor)
        
        # Upload to S3
        s3_url = upload_to_s3(actor_name, jpeg_bytes)
        
        # Update manifest
        update_manifest(actor_name, s3_url)
        
        logger.info(f"✓ Successfully processed {actor_name}")
        return True
        
    except Exception as e:
        logger.error(f"✗ Failed to process {actor_name}: {e}", exc_info=True)
        return False


def main():
    """Main entry point."""
    logger.info("="*80)
    logger.info("BATCH BASE IMAGE GENERATION")
    logger.info(f"Processing {len(ACTOR_IDS)} actors")
    logger.info("="*80)
    
    # Load actors data
    actors = load_actors_data()
    logger.info(f"Loaded {len(actors)} actors from actorsData.json")
    
    # Process each actor
    success_count = 0
    failed_count = 0
    failed_actors = []
    
    for actor_id in ACTOR_IDS:
        actor = find_actor_by_id(actors, actor_id)
        
        if not actor:
            logger.warning(f"Actor {actor_id} not found in actorsData.json")
            failed_count += 1
            failed_actors.append(actor_id)
            continue
        
        if process_actor(actor):
            success_count += 1
        else:
            failed_count += 1
            failed_actors.append(actor_id)
        
        # Small delay between requests to avoid overwhelming RunPod
        time.sleep(2)
    
    # Print summary
    logger.info("="*80)
    logger.info("BATCH GENERATION SUMMARY")
    logger.info("="*80)
    logger.info(f"Total actors: {len(ACTOR_IDS)}")
    logger.info(f"Successful: {success_count}")
    logger.info(f"Failed: {failed_count}")
    
    if failed_actors:
        logger.info(f"Failed actor IDs: {failed_actors}")
    
    logger.info("="*80)
    
    sys.exit(0 if failed_count == 0 else 1)


if __name__ == '__main__':
    main()
