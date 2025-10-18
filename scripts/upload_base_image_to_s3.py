#!/usr/bin/env python3
"""
Upload a base image to S3 and update the actor's manifest.

This script:
1. Converts the image to JPEG if needed
2. Uploads to S3: story-boards-assets/system_actors/base_images/{actor_id}_base.jpg
3. Updates the manifest with S3 URL

Usage:
    python scripts/upload_base_image_to_s3.py <actor_name> <image_path>
"""

import os
import sys
import json
import logging
from pathlib import Path
from PIL import Image
import io

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.utils.s3 import S3Client

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


def convert_to_jpeg(image_path: Path) -> bytes:
    """
    Convert image to JPEG format.
    
    Args:
        image_path: Path to source image
        
    Returns:
        JPEG image bytes
    """
    logger.info(f"Converting {image_path.name} to JPEG...")
    
    # Open image
    img = Image.open(image_path)
    
    # Convert RGBA to RGB if needed
    if img.mode in ('RGBA', 'LA', 'P'):
        # Create white background
        background = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
        img = background
    elif img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Save to bytes buffer
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG', quality=95, optimize=True)
    jpeg_bytes = buffer.getvalue()
    
    logger.info(f"Converted to JPEG: {len(jpeg_bytes) / 1024 / 1024:.2f} MB")
    return jpeg_bytes


def upload_to_s3(actor_name: str, jpeg_bytes: bytes) -> str:
    """
    Upload JPEG to S3.
    
    Args:
        actor_name: Actor name (e.g., "0002_european_35_female")
        jpeg_bytes: JPEG image bytes
        
    Returns:
        S3 URL
    """
    s3_client = S3Client()
    bucket = "story-boards-assets"
    s3_key = f"system_actors/base_images/{actor_name}_base.jpg"
    
    logger.info(f"Uploading to S3: s3://{bucket}/{s3_key}")
    
    # Upload to S3
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
    """
    Update manifest file with S3 URL.
    
    Args:
        actor_name: Actor name (e.g., "0002_european_35_female")
        s3_url: S3 URL of base image
        
    Returns:
        True if successful, False otherwise
    """
    # Extract numeric ID from actor name (e.g., "0002" from "0002_european_35_female")
    numeric_id = actor_name.split('_')[0]
    manifest_path = project_root / "data" / "actor_manifests" / f"{numeric_id}_manifest.json"
    
    if not manifest_path.exists():
        logger.warning(f"Manifest not found: {manifest_path}")
        return False
    
    logger.info(f"Updating manifest: {manifest_path.name}")
    
    # Read manifest
    with open(manifest_path, 'r') as f:
        manifest = json.load(f)
    
    # Update base_images section
    manifest['base_images'] = [{
        'filename': f"{actor_name}_base.jpg",
        's3_url': s3_url,
        'status': 'synced',
        'format': 'jpeg'
    }]
    
    # Update statistics
    if 'statistics' not in manifest:
        manifest['statistics'] = {}
    manifest['statistics']['base_images_count'] = 1
    
    # Write updated manifest
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
    
    logger.info(f"✓ Manifest updated")
    return True


def main():
    """Main entry point."""
    if len(sys.argv) < 3:
        print("Usage: python upload_base_image_to_s3.py <actor_name> <image_path>")
        print("Example: python upload_base_image_to_s3.py '0100_european_25_male' '/path/to/image.jpg'")
        sys.exit(1)
    
    actor_name = sys.argv[1]
    image_path = Path(sys.argv[2])
    
    if not image_path.exists():
        logger.error(f"Image not found: {image_path}")
        sys.exit(1)
    
    try:
        # Convert to JPEG
        jpeg_bytes = convert_to_jpeg(image_path)
        
        # Upload to S3
        s3_url = upload_to_s3(actor_name, jpeg_bytes)
        
        # Update manifest
        if not update_manifest(actor_name, s3_url):
            logger.error("Failed to update manifest")
            sys.exit(1)
        
        # Output JSON result
        result = {
            "status": "success",
            "s3_url": s3_url,
            "actor_name": actor_name
        }
        print(json.dumps(result))
        sys.exit(0)
        
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        result = {
            "status": "error",
            "error": str(e)
        }
        print(json.dumps(result))
        sys.exit(1)


if __name__ == '__main__':
    main()
