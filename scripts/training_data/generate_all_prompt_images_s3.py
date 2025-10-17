#!/usr/bin/env python3
"""
Generate one training image for each available prompt using S3-only architecture.
Uses base image from S3, uploads results to S3, and updates actor manifest.
"""

import sys
import os
import json
import logging
from pathlib import Path
from datetime import datetime
import time
import fcntl
from contextlib import contextmanager
import hashlib
import requests
from io import BytesIO

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from src.replicate_service import ReplicateService
from src.utils.s3 import S3Client
from src.actor_training_prompts import get_actor_training_prompts, get_actor_descriptor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Limit concurrent Replicate requests to prevent rate limiting
MAX_CONCURRENT_REQUESTS = 2
LOCK_DIR = project_root / "data" / ".locks"
LOCK_DIR.mkdir(parents=True, exist_ok=True)


@contextmanager
def acquire_any_request_slot(timeout: int = 300):
    """
    Try to acquire any available request slot.
    
    Args:
        timeout: Maximum time to wait for any slot
    """
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        # Try each slot in order
        for slot in range(MAX_CONCURRENT_REQUESTS):
            lock_file_path = LOCK_DIR / f"replicate_slot_{slot}.lock"
            lock_file = open(lock_file_path, 'w')
            
            try:
                # Try non-blocking lock
                fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                logger.info(f"Acquired request slot {slot} (max {MAX_CONCURRENT_REQUESTS} concurrent)")
                
                # Return context manager
                return _slot_context(lock_file, slot)
                
            except BlockingIOError:
                # This slot is busy, try next one
                lock_file.close()
                continue
        
        # All slots busy, wait a bit
        time.sleep(0.5)
    
    raise TimeoutError(f"Could not acquire any request slot within {timeout}s")


@contextmanager
def _slot_context(lock_file, slot_number):
    """Context manager for holding a lock file."""
    try:
        yield slot_number
    finally:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)
        lock_file.close()
        logger.info(f"Released request slot {slot_number}")


def download_image_from_s3(s3_url: str) -> bytes:
    """Download image from S3 URL."""
    logger.info(f"Downloading base image from S3: {s3_url}")
    response = requests.get(s3_url, timeout=30)
    response.raise_for_status()
    return response.content


def update_manifest(actor_id: str, new_images: list) -> None:
    """
    Update actor manifest with new training images.
    
    Args:
        actor_id: Actor ID (e.g., "0012")
        new_images: List of new image dictionaries with s3_url, filename, etc.
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
        
        # Add new images to training_data
        for img in new_images:
            manifest["training_data"].append({
                "filename": img["filename"],
                "s3_url": img["s3_url"],
                "md5_hash": img.get("md5_hash", ""),
                "size_bytes": img.get("size_bytes", 0),
                "size_mb": round(img.get("size_bytes", 0) / (1024 * 1024), 2),
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
        logger.info(f"Added {len(new_images)} new training images")
        
    except Exception as e:
        logger.error(f"Failed to update manifest: {e}")
        raise


def generate_all_prompt_images_s3(
    actor_id: str,
    actor_name: str,
    base_image_url: str,
    actor_type: str = "person",
    actor_sex: str = None
) -> dict:
    """
    Generate one training image for each available prompt using S3-only architecture.
    
    Args:
        actor_id: Actor ID (e.g., "0012")
        actor_name: Name of the actor (e.g., "0012_european_30_male")
        base_image_url: S3 URL of base/poster image
        actor_type: Type of actor (default: "person")
        actor_sex: Sex of actor ("male", "female", or None)
        
    Returns:
        dict with generation results
    """
    logger.info(f"Generating images for all prompts for actor: {actor_name}")
    logger.info(f"Using base image from S3: {base_image_url}")
    
    # Get descriptor and prompts
    descriptor = get_actor_descriptor(actor_type, actor_sex)
    all_prompts = get_actor_training_prompts(descriptor)
    
    logger.info(f"Found {len(all_prompts)} prompts to generate")
    
    # Initialize services
    replicate = ReplicateService()
    s3_client = S3Client()
    
    # Download base image from S3
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
            logger.info(f"Starting from index: {next_index}")
            
        except Exception as e:
            logger.warning(f"Could not load manifest, starting from index 0: {e}")
    
    # Load existing metadata for prompts
    metadata_path = project_root / "data" / "actors" / actor_name / "training_data" / "prompt_metadata.json"
    metadata_path.parent.mkdir(parents=True, exist_ok=True)
    
    if metadata_path.exists():
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
    else:
        metadata = {"images": {}}
    
    # Generate images
    results = []
    new_manifest_images = []
    bucket_name = os.getenv("AWS_SYSTEM_ACTORS_BUCKET", "story-boards-assets")
    
    for i, prompt in enumerate(all_prompts, 1):
        logger.info(f"[{i}/{len(all_prompts)}] Generating with prompt: {prompt[:80]}...")
        
        try:
            # Acquire file-based lock to limit concurrent requests
            with acquire_any_request_slot(timeout=300) as slot:
                logger.info(f"[{i}/{len(all_prompts)}] Using slot {slot}")
                
                # Generate image with timeout protection
                try:
                    generated_url = replicate.generate_grid_with_flux_kontext(
                        prompt=prompt,
                        input_image_base64=base_image_base64,
                        aspect_ratio="1:1",
                        output_format="jpg"
                    )
                except Exception as gen_error:
                    logger.error(f"Generation failed or timed out: {gen_error}")
                    raise
                
                # Download generated image
                generated_bytes = replicate.download_image_as_bytes(generated_url)
            
            # Generate filename
            local_filename = f"{actor_name}_{next_index}.jpg"
            
            # Calculate MD5 hash
            md5_hash = hashlib.md5(generated_bytes).hexdigest()
            
            # Upload directly to S3 (no local save)
            s3_key = f"system_actors/training_data/{actor_name}/{local_filename}"
            result = s3_client.upload_image(
                image_data=generated_bytes,
                bucket=bucket_name,
                key=s3_key,
                extension='jpg'
            )
            s3_url = result['Location']
            
            logger.info(f"Uploaded to S3: {s3_url}")
            
            # Add to metadata
            metadata["images"][local_filename] = {
                "prompt": prompt,
                "prompt_preview": prompt[:100] + "..." if len(prompt) > 100 else prompt,
                "generated_at": datetime.now().isoformat(),
                "s3_url": s3_url,
                "index": next_index
            }
            
            # Add to manifest update list
            new_manifest_images.append({
                "filename": local_filename,
                "s3_url": s3_url,
                "md5_hash": md5_hash,
                "size_bytes": len(generated_bytes)
            })
            
            results.append({
                "index": next_index,
                "filename": local_filename,
                "s3_url": s3_url,
                "prompt_preview": prompt[:80] + "..."
            })
            
            next_index += 1
            
            # Save metadata after each successful image
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            logger.info(f"Metadata saved for image {i}/{len(all_prompts)}")
            
            # Small delay between requests
            if i < len(all_prompts):
                time.sleep(1)
            
        except Exception as e:
            logger.error(f"Failed to generate image {i}: {e}")
            results.append({
                "index": next_index,
                "error": str(e),
                "prompt_preview": prompt[:80] + "..."
            })
            next_index += 1
            
            # Small delay even on error
            if i < len(all_prompts):
                time.sleep(2)
    
    # Update manifest with all new images
    if new_manifest_images:
        try:
            update_manifest(actor_id, new_manifest_images)
        except Exception as e:
            logger.error(f"Failed to update manifest: {e}")
    
    # Final save of metadata
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    logger.info(f"Completed! Generated {len(results)} images")
    
    successful = [r for r in results if 'error' not in r]
    failed = [r for r in results if 'error' in r]
    
    return {
        "success": True,
        "total": len(all_prompts),
        "successful": len(successful),
        "failed": len(failed),
        "results": results
    }


def main():
    """Main entry point for CLI usage."""
    if len(sys.argv) < 4:
        print("Usage: python generate_all_prompt_images_s3.py <actor_id> <actor_name> <base_image_url> [actor_type] [actor_sex]")
        print("Example: python generate_all_prompt_images_s3.py 0012 0012_european_30_male https://s3.../base.jpg person male")
        sys.exit(1)
    
    actor_id = sys.argv[1]
    actor_name = sys.argv[2]
    base_image_url = sys.argv[3]
    actor_type = sys.argv[4] if len(sys.argv) > 4 else "person"
    actor_sex = sys.argv[5] if len(sys.argv) > 5 else None
    
    try:
        result = generate_all_prompt_images_s3(
            actor_id=actor_id,
            actor_name=actor_name,
            base_image_url=base_image_url,
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
