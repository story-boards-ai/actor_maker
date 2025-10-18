#!/usr/bin/env python3
"""
Recreate a training image with the same prompt and parameters, overwriting the existing S3 file.
Uses the existing generate_single_training_image_s3.py logic but with a specific filename.
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


def update_manifest(actor_id: str, filename: str, new_image_data: dict) -> None:
    """
    Update actor manifest with recreated training image.
    Finds the existing entry and updates it.
    
    Args:
        actor_id: Actor ID (e.g., "0012")
        filename: Filename to update
        new_image_data: Updated image dictionary with s3_url, md5_hash, etc.
    """
    manifest_path = project_root / "data" / "actor_manifests" / f"{actor_id.zfill(4)}_manifest.json"
    
    if not manifest_path.exists():
        logger.warning(f"Manifest not found: {manifest_path}")
        return
    
    try:
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
        
        # Find and update the existing image entry
        training_data = manifest.get("training_data", [])
        updated = False
        
        for img in training_data:
            if img.get("filename") == filename:
                # Update the existing entry
                img["s3_url"] = new_image_data["s3_url"]
                img["md5_hash"] = new_image_data.get("md5_hash", "")
                img["size_bytes"] = new_image_data.get("size_bytes", 0)
                img["size_mb"] = round(new_image_data.get("size_bytes", 0) / (1024 * 1024), 2)
                img["modified_timestamp"] = time.time()
                img["modified_date"] = datetime.now().isoformat()
                img["status"] = "synced"
                updated = True
                break
        
        if not updated:
            logger.warning(f"Image {filename} not found in manifest, adding as new entry")
            manifest["training_data"].append({
                "filename": filename,
                "s3_url": new_image_data["s3_url"],
                "md5_hash": new_image_data.get("md5_hash", ""),
                "size_bytes": new_image_data.get("size_bytes", 0),
                "size_mb": round(new_image_data.get("size_bytes", 0) / (1024 * 1024), 2),
                "modified_timestamp": time.time(),
                "modified_date": datetime.now().isoformat(),
                "status": "synced"
            })
        
        # Update training_data_updated timestamp
        manifest["training_data_updated"] = datetime.now().isoformat()
        
        # Save manifest
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
        
        logger.info(f"Updated manifest: {manifest_path}")
        
    except Exception as e:
        logger.error(f"Failed to update manifest: {e}")
        raise


def recreate_training_image_s3(
    actor_id: str,
    actor_name: str,
    base_image_url: str,
    prompt: str,
    filename: str,
    aspect_ratio: str = "1:1"
) -> dict:
    """
    Recreate a training image, overwriting the existing S3 file.
    
    Args:
        actor_id: Actor ID (e.g., "0012")
        actor_name: Name of the actor (e.g., "0012_european_30_male")
        base_image_url: S3 URL of base/poster image
        prompt: Generation prompt (same as original)
        filename: Existing filename to overwrite
        aspect_ratio: Aspect ratio for generated image ("1:1" or "16:9")
        
    Returns:
        dict with recreated image info
    """
    logger.info(f"Recreating training image for actor: {actor_name}")
    logger.info(f"Filename to overwrite: {filename}")
    logger.info(f"Using base image from S3: {base_image_url}")
    logger.info(f"Using prompt: {prompt[:100]}...")
    logger.info(f"Aspect ratio: {aspect_ratio}")
    
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
    logger.info(f"Calling Replicate flux-kontext-pro with aspect ratio: {aspect_ratio}...")
    logger.info(f"Full prompt being sent: {prompt}")
    
    try:
        generated_url = replicate.generate_grid_with_flux_kontext(
            prompt=prompt,
            input_image_base64=base_image_base64,
            aspect_ratio=aspect_ratio,
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
    
    # Calculate MD5 hash
    md5_hash = hashlib.md5(generated_bytes).hexdigest()
    
    # Upload to S3 with the SAME filename (overwrites existing)
    bucket_name = os.getenv("AWS_SYSTEM_ACTORS_BUCKET", "story-boards-assets")
    s3_key = f"system_actors/training_data/{actor_name}/{filename}"
    
    result = s3_client.upload_image(
        image_data=generated_bytes,
        bucket=bucket_name,
        key=s3_key,
        extension='jpg'
    )
    s3_url = result['Location']
    
    logger.info(f"Uploaded to S3 (overwritten): {s3_url}")
    
    # Update manifest
    try:
        update_manifest(actor_id, filename, {
            "s3_url": s3_url,
            "md5_hash": md5_hash,
            "size_bytes": len(generated_bytes)
        })
    except Exception as e:
        logger.error(f"Failed to update manifest: {e}")
    
    # Update prompt metadata
    metadata_path = project_root / "data" / "actors" / actor_name / "training_data" / "prompt_metadata.json"
    metadata_path.parent.mkdir(parents=True, exist_ok=True)
    
    if metadata_path.exists():
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
    else:
        metadata = {"images": {}}
    
    # Update prompt info for this image
    if filename in metadata.get("images", {}):
        metadata["images"][filename]["regenerated_at"] = datetime.now().isoformat()
        metadata["images"][filename]["s3_url"] = s3_url
    else:
        metadata["images"][filename] = {
            "prompt": prompt,
            "prompt_preview": prompt[:100] + "..." if len(prompt) > 100 else prompt,
            "generated_at": datetime.now().isoformat(),
            "s3_url": s3_url
        }
    
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    logger.info(f"Updated prompt metadata")
    
    return {
        "success": True,
        "s3_url": s3_url,
        "filename": filename,
        "prompt": prompt,
        "overwritten": True
    }


def main():
    """Main entry point for CLI usage."""
    if len(sys.argv) < 6:
        print("Usage: python recreate_training_image_s3.py <actor_id> <actor_name> <base_image_url> <prompt> <filename> [aspect_ratio]")
        print("Example: python recreate_training_image_s3.py 0012 0012_european_30_male https://s3.../base.jpg 'A person in a scene' 0012_european_30_male_5.jpg 1:1")
        sys.exit(1)
    
    actor_id = sys.argv[1]
    actor_name = sys.argv[2]
    base_image_url = sys.argv[3]
    prompt = sys.argv[4]
    filename = sys.argv[5]
    aspect_ratio = sys.argv[6] if len(sys.argv) > 6 else "1:1"
    
    logger.info(f"Arguments received:")
    logger.info(f"  actor_id: {actor_id}")
    logger.info(f"  actor_name: {actor_name}")
    logger.info(f"  base_image_url: {base_image_url}")
    logger.info(f"  prompt: {prompt[:50]}...")
    logger.info(f"  filename: {filename}")
    logger.info(f"  aspect_ratio: {aspect_ratio}")
    
    try:
        result = recreate_training_image_s3(
            actor_id=actor_id,
            actor_name=actor_name,
            base_image_url=base_image_url,
            prompt=prompt,
            filename=filename,
            aspect_ratio=aspect_ratio
        )
        
        # Output JSON for Node.js to parse
        print(json.dumps(result))
        
    except Exception as e:
        logger.error(f"Recreate failed: {e}", exc_info=True)
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
