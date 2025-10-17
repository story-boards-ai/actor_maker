#!/usr/bin/env python3
"""
Add LoRA model file information to actor manifest files.

This script:
1. Lists all safetensors files from S3 (system_actors/lora_models/)
2. Calculates MD5 hash for each model file
3. Updates corresponding actor manifest with model information
"""

import os
import sys
import json
import hashlib
import boto3
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.s3 import S3Client

# S3 configuration
BUCKET_NAME = os.getenv('AWS_ASSETS_BUCKET', 'story-boards-assets')
LORA_MODELS_PREFIX = 'system_actors/lora_models/'
MANIFESTS_DIR = Path(__file__).parent.parent / 'data' / 'actor_manifests'


def get_s3_file_etag(s3_client, bucket: str, key: str) -> str:
    """
    Get ETag (MD5 hash) of a file in S3 without downloading it.
    
    For files uploaded in a single PUT operation, ETag is the MD5 hash.
    For multipart uploads, ETag has a different format (contains a dash).
    
    Args:
        s3_client: Boto3 S3 client
        bucket: S3 bucket name
        key: S3 object key
        
    Returns:
        ETag/MD5 hash as hex string (without quotes)
    """
    # Use head_object to get metadata without downloading
    response = s3_client.head_object(Bucket=bucket, Key=key)
    etag = response['ETag'].strip('"')  # Remove quotes from ETag
    return etag


def get_lora_models_from_s3(s3_client) -> dict:
    """
    Get all LoRA model files from S3 with their metadata.
    
    Returns:
        Dictionary mapping actor_id to model info
    """
    print(f"\nFetching LoRA models from s3://{BUCKET_NAME}/{LORA_MODELS_PREFIX}")
    
    models = {}
    paginator = s3_client.get_paginator('list_objects_v2')
    
    for page in paginator.paginate(Bucket=BUCKET_NAME, Prefix=LORA_MODELS_PREFIX):
        if 'Contents' not in page:
            continue
            
        for obj in page['Contents']:
            key = obj['Key']
            
            # Only process .safetensors files
            if not key.endswith('.safetensors'):
                continue
            
            filename = os.path.basename(key)
            
            # Extract actor ID from filename (e.g., "0000_european_16_male.safetensors" -> "0000")
            actor_id = filename.split('_')[0]
            
            # Skip style LoRAs (they don't have numeric IDs)
            if not actor_id.isdigit():
                print(f"  Skipping style LoRA: {filename}")
                continue
            
            print(f"\nProcessing: {filename}")
            print(f"  Actor ID: {actor_id}")
            print(f"  Size: {obj['Size']:,} bytes ({obj['Size'] / (1024*1024):.2f} MB)")
            print(f"  Last Modified: {obj['LastModified']}")
            
            # Get ETag (MD5 hash) from S3 metadata - much faster than downloading!
            etag = get_s3_file_etag(s3_client, BUCKET_NAME, key)
            print(f"  ETag/MD5: {etag}")
            
            # Build S3 URLs
            s3_url = f"https://{BUCKET_NAME}.s3.us-west-1.amazonaws.com/{key}"
            s3_accelerated_url = f"https://{BUCKET_NAME}.s3-accelerate.amazonaws.com/{key}"
            
            models[actor_id] = {
                'filename': filename,
                's3_url': s3_url,
                's3_accelerated_url': s3_accelerated_url,
                'size_bytes': obj['Size'],
                'size_mb': round(obj['Size'] / (1024 * 1024), 2),
                'md5_hash': etag,  # ETag is MD5 for single-part uploads
                'last_modified': obj['LastModified'].isoformat(),
                'created_date': obj['LastModified'].strftime('%Y-%m-%d'),
                'format': 'safetensors'
            }
    
    print(f"\nFound {len(models)} actor LoRA models")
    return models


def update_manifest_with_lora(manifest_path: Path, lora_info: dict) -> bool:
    """
    Update a manifest file with LoRA model information.
    
    Args:
        manifest_path: Path to manifest JSON file
        lora_info: Dictionary with LoRA model information
        
    Returns:
        True if updated, False if skipped
    """
    try:
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
        
        actor_id = manifest.get('character_id')
        actor_name = manifest.get('character_name')
        
        print(f"\nUpdating manifest: {manifest_path.name}")
        print(f"  Actor: {actor_name} (ID: {actor_id})")
        
        # Add lora_model section
        manifest['lora_model'] = {
            'filename': lora_info['filename'],
            's3_url': lora_info['s3_url'],
            's3_accelerated_url': lora_info['s3_accelerated_url'],
            'size_bytes': lora_info['size_bytes'],
            'size_mb': lora_info['size_mb'],
            'md5_hash': lora_info['md5_hash'],
            'last_modified': lora_info['last_modified'],
            'created_date': lora_info['created_date'],
            'format': lora_info['format']
        }
        
        # Update timestamp
        manifest['lora_model_updated'] = datetime.now().isoformat()
        
        # Write back to file
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
        
        print(f"  ✓ Updated with LoRA model: {lora_info['filename']}")
        print(f"  ✓ Size: {lora_info['size_mb']} MB")
        print(f"  ✓ MD5: {lora_info['md5_hash']}")
        
        return True
        
    except Exception as e:
        print(f"  ✗ Error updating manifest: {e}")
        return False


def main():
    """Main execution function."""
    print("=" * 80)
    print("Adding LoRA Model Information to Actor Manifests")
    print("=" * 80)
    
    # Initialize S3 client
    s3_client_wrapper = S3Client()
    s3_client = s3_client_wrapper.s3
    
    # Get all LoRA models from S3
    lora_models = get_lora_models_from_s3(s3_client)
    
    if not lora_models:
        print("\n✗ No LoRA models found in S3")
        return 1
    
    # Process each manifest
    print("\n" + "=" * 80)
    print("Updating Manifest Files")
    print("=" * 80)
    
    updated_count = 0
    skipped_count = 0
    error_count = 0
    
    for manifest_file in sorted(MANIFESTS_DIR.glob('*_manifest.json')):
        # Extract actor ID from manifest filename (e.g., "0000_manifest.json" -> "0000")
        actor_id = manifest_file.stem.split('_')[0]
        
        if actor_id in lora_models:
            if update_manifest_with_lora(manifest_file, lora_models[actor_id]):
                updated_count += 1
            else:
                error_count += 1
        else:
            print(f"\nSkipping {manifest_file.name} - no LoRA model found for actor {actor_id}")
            skipped_count += 1
    
    # Summary
    print("\n" + "=" * 80)
    print("Summary")
    print("=" * 80)
    print(f"Total LoRA models found: {len(lora_models)}")
    print(f"Manifests updated: {updated_count}")
    print(f"Manifests skipped: {skipped_count}")
    print(f"Errors: {error_count}")
    print("=" * 80)
    
    return 0 if error_count == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
