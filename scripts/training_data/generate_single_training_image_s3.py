#!/usr/bin/env python3
"""
Generate a single training image using Replicate flux-kontext-pro with S3-only architecture.
Uses base image from S3, uploads result to S3, and updates actor manifest.
"""

import sys
import os
import json
import logging
from pathlib import Path
from datetime import datetime
import time
import hashlib
import requests

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from src.replicate_service import ReplicateService
from src.utils.s3 import S3Client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def download_image_from_s3(s3_url: str) -> bytes:
    """Download image from S3 URL."""
    logger.info(f"Downloading base image from S3: {s3_url}")
    response = requests.get(s3_url, timeout=30)
    response.raise_for_status()
    return response.content


def update_manifest(actor_id: str, new_image: dict) -> None:
    """
    Update actor manifest with new training image.
    
    Args:
        actor_id: Actor ID (e.g., "0012")
        new_image: Image dictionary with s3_url, filename, etc.
    """
    manifest_path = project_root / "data" / "actor_manifests" / f"{actor_id.zfill(4)}_manifest.json"
    
    if not manifest_path.exists():
        logger.warning(f"Manifest not found: {manifest_path}")
        return
    
    try:
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
        
        # Ensure training_data array exists
        if "training_data" not in manifest:
            manifest["training_data"] = []
        
        # Add new image to training_data
        manifest["training_data"].append({
            "filename": new_image["filename"],
            "s3_url": new_image["s3_url"],
            "md5_hash": new_image.get("md5_hash", ""),
            "size_bytes": new_image.get("size_bytes", 0),
            "size_mb": round(new_image.get("size_bytes", 0) / (1024 * 1024), 2),
            "modified_timestamp": time.time(),
            "modified_date": datetime.now().isoformat(),
            "status": "synced"
        })
        
        # Update statistics
        if "statistics" not in manifest:
            manifest["statistics"] = {}
        
        manifest["statistics"]["training_images_count"] = len(manifest["training_data"])
        manifest["statistics"]["training_synced_count"] = len([
            img for img in manifest["training_data"] if img.get("status") == "synced"
        ])
        
        # Update training_data_updated timestamp
        manifest["training_data_updated"] = datetime.now().isoformat()
        
        # Save manifest
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
        
        logger.info(f"Updated manifest: {manifest_path}")
        
    except Exception as e:
        logger.error(f"Failed to update manifest: {e}")
        raise


def generate_single_training_image_s3(
    actor_id: str,
    actor_name: str,
    base_image_url: str,
    prompt: str,
    actor_type: str = "person",
    actor_sex: str = None
) -> dict:
    """
    Generate a single training image using S3-only architecture.
    
    Args:
        actor_id: Actor ID (e.g., "0012")
        actor_name: Name of the actor (e.g., "0012_european_30_male")
        base_image_url: S3 URL of base/poster image
        prompt: Generation prompt
        actor_type: Type of actor (default: "person")
        actor_sex: Sex of actor ("male", "female", or None)
        
    Returns:
        dict with generated image info
    """
    logger.info(f"Generating training image for actor: {actor_name}")
    logger.info(f"Using base image from S3: {base_image_url}")
    logger.info(f"Using prompt: {prompt[:100]}...")
    
    # Initialize Replicate service
    replicate = ReplicateService()
    s3_client = S3Client()
    
    # Download base image from S3 and convert to base64
    try:
        base_image_bytes = download_image_from_s3(base_image_url)
        import base64
        base_image_base64 = base64.b64encode(base_image_bytes).decode('utf-8')
        logger.info(f"Base image loaded: {len(base_image_base64)} bytes")
    except Exception as e:
        logger.error(f"Failed to download base image: {e}")
        return {
            "success": False,
            "error": f"Failed to download base image: {str(e)}"
        }
    
    # Generate image with flux-kontext-pro
    logger.info("Calling Replicate flux-kontext-pro...")
    try:
        generated_url = replicate.generate_grid_with_flux_kontext(
            prompt=prompt,
            input_image_base64=base_image_base64,
            aspect_ratio="1:1",
            output_format="jpg"
        )
        logger.info(f"Image generated: {generated_url}")
    except Exception as e:
        logger.error(f"Generation failed: {e}")
        return {
            "success": False,
            "error": f"Generation failed: {str(e)}"
        }
    
    # Download generated image
    generated_bytes = replicate.download_image_as_bytes(generated_url)
    
    # Load manifest to find next index
    manifest_path = project_root / "data" / "actor_manifests" / f"{actor_id.zfill(4)}_manifest.json"
    next_index = 0
    
    if manifest_path.exists():
        try:
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            
            # Find highest index from existing training data
            existing_indices = []
            for img in manifest.get("training_data", []):
                filename = img.get("filename", "")
                # Extract index from filename like "0012_european_30_male_5.jpg"
                try:
                    parts = filename.replace(".jpg", "").replace(".png", "").split("_")
                    if parts[-1].isdigit():
                        existing_indices.append(int(parts[-1]))
                except:
                    pass
            
            next_index = max(existing_indices, default=-1) + 1
            logger.info(f"Using index: {next_index}")
            
        except Exception as e:
            logger.warning(f"Could not load manifest, using index 0: {e}")
    
    # Generate filename
    local_filename = f"{actor_name}_{next_index}.jpg"
    
    # Calculate MD5 hash
    md5_hash = hashlib.md5(generated_bytes).hexdigest()
    
    # Upload directly to S3 (no local save)
    bucket_name = os.getenv("AWS_SYSTEM_ACTORS_BUCKET", "story-boards-assets")
    s3_key = f"system_actors/training_data/{actor_name}/{local_filename}"
    
    result = s3_client.upload_image(
        image_data=generated_bytes,
        bucket=bucket_name,
        key=s3_key,
        extension='jpg'
    )
    s3_url = result['Location']
    
    logger.info(f"Uploaded to S3: {s3_url}")
    
    # Update manifest
    try:
        update_manifest(actor_id, {
            "filename": local_filename,
            "s3_url": s3_url,
            "md5_hash": md5_hash,
            "size_bytes": len(generated_bytes)
        })
    except Exception as e:
        logger.error(f"Failed to update manifest: {e}")
    
    # Save prompt metadata
    metadata_path = project_root / "data" / "actors" / actor_name / "training_data" / "prompt_metadata.json"
    metadata_path.parent.mkdir(parents=True, exist_ok=True)
    
    if metadata_path.exists():
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
    else:
        metadata = {"images": {}}
    
    # Store prompt info for this image
    metadata["images"][local_filename] = {
        "prompt": prompt,
        "prompt_preview": prompt[:100] + "..." if len(prompt) > 100 else prompt,
        "generated_at": datetime.now().isoformat(),
        "s3_url": s3_url,
        "index": next_index
    }
    
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    logger.info(f"Saved prompt metadata")
    
    return {
        "success": True,
        "s3_url": s3_url,
        "filename": local_filename,
        "index": next_index,
        "prompt": prompt
    }


def main():
    """Main entry point for CLI usage."""
    if len(sys.argv) < 5:
        print("Usage: python generate_single_training_image_s3.py <actor_id> <actor_name> <base_image_url> <prompt> [actor_type] [actor_sex]")
        print("Example: python generate_single_training_image_s3.py 0012 0012_european_30_male https://s3.../base.jpg 'A person in a scene' person male")
        sys.exit(1)
    
    actor_id = sys.argv[1]
    actor_name = sys.argv[2]
    base_image_url = sys.argv[3]
    prompt = sys.argv[4]
    actor_type = sys.argv[5] if len(sys.argv) > 5 else "person"
    actor_sex = sys.argv[6] if len(sys.argv) > 6 else None
    
    try:
        result = generate_single_training_image_s3(
            actor_id=actor_id,
            actor_name=actor_name,
            base_image_url=base_image_url,
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
