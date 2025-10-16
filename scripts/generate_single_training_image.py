#!/usr/bin/env python3
"""
Generate a single training image using Replicate flux-kontext-pro.
Saves locally and uploads to S3.
"""

import sys
import os
import json
import logging
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.replicate_service import ReplicateService
from src.utils.s3 import S3Client
from src.actor_training_prompts import get_actor_training_prompts, get_actor_descriptor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def generate_single_training_image(
    actor_name: str,
    base_image_path: str,
    prompt: str,
    actor_type: str = "person",
    actor_sex: str = None
) -> dict:
    """
    Generate a single training image from base image using Replicate.
    
    Args:
        actor_name: Name of the actor (e.g., "0000_european_16_male")
        base_image_path: Path to base/poster image
        prompt: Generation prompt
        actor_type: Type of actor (default: "person")
        actor_sex: Sex of actor ("male", "female", or None)
        
    Returns:
        dict with generated image info
    """
    logger.info(f"Generating training image for actor: {actor_name}")
    logger.info(f"Using prompt: {prompt[:100]}...")
    
    # Initialize Replicate service
    replicate = ReplicateService()
    
    # Read base image and convert to base64
    with open(base_image_path, 'rb') as f:
        import base64
        base_image_base64 = base64.b64encode(f.read()).decode('utf-8')
    
    logger.info(f"Base image loaded: {len(base_image_base64)} bytes")
    
    # Generate image with flux-kontext-pro
    logger.info("Calling Replicate flux-kontext-pro...")
    generated_url = replicate.generate_grid_with_flux_kontext(
        prompt=prompt,
        input_image_base64=base_image_base64,
        aspect_ratio="1:1",
        output_format="jpg"
    )
    
    logger.info(f"Image generated: {generated_url}")
    
    # Download generated image
    generated_bytes = replicate.download_image_as_bytes(generated_url)
    
    # Save locally
    training_data_dir = project_root / "data" / "actors" / actor_name / "training_data"
    training_data_dir.mkdir(parents=True, exist_ok=True)
    
    # Find next available index
    existing_files = list(training_data_dir.glob(f"{actor_name}_*.png"))
    existing_files += list(training_data_dir.glob(f"{actor_name}_*.jpg"))
    existing_indices = []
    for f in existing_files:
        try:
            # Extract index from filename like "0000_european_16_male_5.png"
            parts = f.stem.split('_')
            if parts[-1].isdigit():
                existing_indices.append(int(parts[-1]))
        except:
            pass
    
    next_index = max(existing_indices, default=-1) + 1
    local_filename = f"{actor_name}_{next_index}.jpg"
    local_path = training_data_dir / local_filename
    
    with open(local_path, 'wb') as f:
        f.write(generated_bytes)
    
    logger.info(f"Saved locally: {local_path}")
    
    # Upload to S3
    bucket_name = os.getenv("AWS_SYSTEM_ACTORS_BUCKET", "story-boards-assets")
    s3_key = f"system_actors/training_data/{actor_name}/{local_filename}"
    
    s3_client = S3Client()
    result = s3_client.upload_image(
        image_data=generated_bytes,
        bucket=bucket_name,
        key=s3_key,
        extension='jpg'
    )
    s3_url = result['Location']
    
    logger.info(f"Uploaded to S3: {s3_url}")
    
    # Update response.json with new image
    response_json_path = training_data_dir / "response.json"
    if response_json_path.exists():
        with open(response_json_path, 'r') as f:
            response_data = json.load(f)
    else:
        response_data = {"output": {"output": {"s3_image_urls": []}}}
    
    # Add new URL to list
    if "output" not in response_data:
        response_data["output"] = {}
    if "output" not in response_data["output"]:
        response_data["output"]["output"] = {}
    if "s3_image_urls" not in response_data["output"]["output"]:
        response_data["output"]["output"]["s3_image_urls"] = []
    
    response_data["output"]["output"]["s3_image_urls"].append(s3_url)
    
    with open(response_json_path, 'w') as f:
        json.dump(response_data, f, indent=2)
    
    logger.info(f"Updated response.json with new image URL")
    
    return {
        "success": True,
        "local_path": str(local_path),
        "s3_url": s3_url,
        "filename": local_filename,
        "index": next_index,
        "prompt": prompt
    }


def main():
    """Main entry point for CLI usage."""
    if len(sys.argv) < 4:
        print("Usage: python generate_single_training_image.py <actor_name> <base_image_path> <prompt> [actor_type] [actor_sex]")
        print("Example: python generate_single_training_image.py 0000_european_16_male /path/to/base.png 'A person in a dramatic scene' person male")
        sys.exit(1)
    
    actor_name = sys.argv[1]
    base_image_path = sys.argv[2]
    prompt = sys.argv[3]
    actor_type = sys.argv[4] if len(sys.argv) > 4 else "person"
    actor_sex = sys.argv[5] if len(sys.argv) > 5 else None
    
    try:
        result = generate_single_training_image(
            actor_name=actor_name,
            base_image_path=base_image_path,
            prompt=prompt,
            actor_type=actor_type,
            actor_sex=actor_sex
        )
        
        # Output JSON for Node.js to parse
        print(json.dumps(result))
        
    except Exception as e:
        logger.error(f"Generation failed: {e}", exc_info=True)
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
