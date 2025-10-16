#!/usr/bin/env python3
"""
Generate one training image for each available prompt.
Useful for creating a balanced initial training dataset.
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

# Add project root to path
project_root = Path(__file__).parent.parent
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
def acquire_request_slot(slot_number: int, timeout: int = 300):
    """
    Acquire a request slot using file-based locking.
    This works across multiple processes to enforce global concurrency limit.
    
    Args:
        slot_number: Which slot to try to acquire (0 or 1 for 2 concurrent)
        timeout: Maximum time to wait for slot in seconds
    """
    lock_file_path = LOCK_DIR / f"replicate_slot_{slot_number}.lock"
    lock_file = open(lock_file_path, 'w')
    
    start_time = time.time()
    acquired = False
    
    try:
        # Try to acquire lock with timeout
        while time.time() - start_time < timeout:
            try:
                fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                acquired = True
                logger.info(f"Acquired request slot {slot_number}")
                break
            except BlockingIOError:
                # Slot is busy, wait a bit
                time.sleep(0.5)
        
        if not acquired:
            raise TimeoutError(f"Could not acquire request slot {slot_number} within {timeout}s")
        
        yield
        
    finally:
        if acquired:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)
            logger.info(f"Released request slot {slot_number}")
        lock_file.close()


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


def generate_all_prompt_images(
    actor_name: str,
    base_image_path: str,
    actor_type: str = "person",
    actor_sex: str = None
) -> dict:
    """
    Generate one training image for each available prompt.
    
    Args:
        actor_name: Name of the actor (e.g., "0000_european_16_male")
        base_image_path: Path to base/poster image
        actor_type: Type of actor (default: "person")
        actor_sex: Sex of actor ("male", "female", or None)
        
    Returns:
        dict with generation results
    """
    logger.info(f"Generating images for all prompts for actor: {actor_name}")
    
    # Get descriptor and prompts
    descriptor = get_actor_descriptor(actor_type, actor_sex)
    all_prompts = get_actor_training_prompts(descriptor)
    
    logger.info(f"Found {len(all_prompts)} prompts to generate")
    
    # Initialize services
    replicate = ReplicateService()
    s3_client = S3Client()
    
    # Read base image once
    with open(base_image_path, 'rb') as f:
        import base64
        base_image_base64 = base64.b64encode(f.read()).decode('utf-8')
    
    logger.info(f"Base image loaded: {len(base_image_base64)} bytes")
    
    # Setup paths
    training_data_dir = project_root / "data" / "actors" / actor_name / "training_data"
    training_data_dir.mkdir(parents=True, exist_ok=True)
    
    # Find starting index
    existing_files = list(training_data_dir.glob(f"{actor_name}_*.png"))
    existing_files += list(training_data_dir.glob(f"{actor_name}_*.jpg"))
    existing_indices = []
    for f in existing_files:
        try:
            parts = f.stem.split('_')
            if parts[-1].isdigit():
                existing_indices.append(int(parts[-1]))
        except:
            pass
    
    next_index = max(existing_indices, default=-1) + 1
    
    # Load existing metadata
    metadata_path = training_data_dir / "prompt_metadata.json"
    if metadata_path.exists():
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
    else:
        metadata = {"images": {}}
    
    # Load response.json
    response_json_path = training_data_dir / "response.json"
    if response_json_path.exists():
        with open(response_json_path, 'r') as f:
            response_data = json.load(f)
    else:
        response_data = {"output": {"output": {"s3_image_urls": []}}}
    
    if "output" not in response_data:
        response_data["output"] = {}
    if "output" not in response_data["output"]:
        response_data["output"]["output"] = {}
    if "s3_image_urls" not in response_data["output"]["output"]:
        response_data["output"]["output"]["s3_image_urls"] = []
    
    # Generate images
    results = []
    bucket_name = os.getenv("AWS_SYSTEM_ACTORS_BUCKET", "story-boards-assets")
    
    for i, prompt in enumerate(all_prompts, 1):
        logger.info(f"[{i}/{len(all_prompts)}] Generating with prompt: {prompt[:80]}...")
        
        try:
            # Acquire file-based lock to limit concurrent requests across all processes
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
            
            # Save locally
            local_filename = f"{actor_name}_{next_index}.jpg"
            local_path = training_data_dir / local_filename
            
            with open(local_path, 'wb') as f:
                f.write(generated_bytes)
            
            logger.info(f"Saved locally: {local_path}")
            
            # Upload to S3
            s3_key = f"system_actors/training_data/{actor_name}/{local_filename}"
            result = s3_client.upload_image(
                image_data=generated_bytes,
                bucket=bucket_name,
                key=s3_key,
                extension='jpg'
            )
            s3_url = result['Location']
            
            logger.info(f"Uploaded to S3: {s3_url}")
            
            # Add to response.json
            response_data["output"]["output"]["s3_image_urls"].append(s3_url)
            
            # Add to metadata
            metadata["images"][local_filename] = {
                "prompt": prompt,
                "prompt_preview": prompt[:100] + "..." if len(prompt) > 100 else prompt,
                "generated_at": datetime.now().isoformat(),
                "s3_url": s3_url,
                "index": next_index
            }
            
            results.append({
                "index": next_index,
                "filename": local_filename,
                "s3_url": s3_url,
                "prompt_preview": prompt[:80] + "..."
            })
            
            next_index += 1
            
            # Save metadata and response.json after each successful image
            # This ensures progress is preserved even if the script crashes
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            with open(response_json_path, 'w') as f:
                json.dump(response_data, f, indent=2)
            
            logger.info(f"Metadata saved for image {i}/{len(all_prompts)}")
            
            # Small delay between requests to be respectful to API
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
            
            # Small delay even on error before retrying next prompt
            if i < len(all_prompts):
                time.sleep(2)
    
    # Final save of metadata and response.json (redundant but ensures completeness)
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    with open(response_json_path, 'w') as f:
        json.dump(response_data, f, indent=2)
    
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
    if len(sys.argv) < 3:
        print("Usage: python generate_all_prompt_images.py <actor_name> <base_image_path> [actor_type] [actor_sex]")
        print("Example: python generate_all_prompt_images.py 0000_european_16_male /path/to/base.png person male")
        sys.exit(1)
    
    actor_name = sys.argv[1]
    base_image_path = sys.argv[2]
    actor_type = sys.argv[3] if len(sys.argv) > 3 else "person"
    actor_sex = sys.argv[4] if len(sys.argv) > 4 else None
    
    try:
        result = generate_all_prompt_images(
            actor_name=actor_name,
            base_image_path=base_image_path,
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
