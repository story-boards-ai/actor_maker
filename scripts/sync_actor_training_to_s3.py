#!/usr/bin/env python3
"""
Sync actor training images from local storage to S3.
Uploads local training images to S3 bucket.
"""
import sys
import json
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.utils.s3 import S3Client

def sync_to_s3(actor_name: str) -> dict:
    """
    Upload training images from local storage to S3.
    
    Args:
        actor_name: Name of the actor (e.g., "0002_european_35_female")
    
    Returns:
        Dict with upload results
    """
    # Initialize S3 client
    s3_client = S3Client()
    
    # S3 bucket and prefix
    bucket = 'story-boards-assets'
    s3_prefix = f'system_actors/training_data/{actor_name}'
    
    # Local directory
    local_dir = project_root / 'data' / 'actors' / actor_name / 'training_data'
    
    if not local_dir.exists():
        return {
            'error': f'Training data directory not found: {local_dir}',
            'uploaded': 0,
            'failed': 0,
            'total': 0
        }
    
    # Find all image files
    image_files = []
    for ext in ['*.png', '*.jpg', '*.jpeg']:
        image_files.extend(local_dir.glob(ext))
    
    if not image_files:
        return {
            'uploaded': 0,
            'failed': 0,
            'total': 0,
            'message': 'No images found to upload'
        }
    
    uploaded = 0
    failed = 0
    errors = []
    uploaded_urls = []
    
    for local_path in image_files:
        try:
            filename = local_path.name
            s3_key = f'{s3_prefix}/{filename}'
            
            # Check if already exists in S3
            if s3_client.file_exists(bucket, s3_key):
                print(f"⏭️  Skipping {filename} (already exists in S3)", file=sys.stderr)
                uploaded += 1
                url = f"https://{bucket}.s3.us-west-1.amazonaws.com/{s3_key}"
                uploaded_urls.append(url)
                continue
            
            # Read file
            with open(local_path, 'rb') as f:
                file_data = f.read()
            
            # Determine extension
            ext = local_path.suffix.lstrip('.').lower()
            
            # Upload to S3
            print(f"⬆️  Uploading {filename}...", file=sys.stderr)
            result = s3_client.upload_image(
                image_data=file_data,
                bucket=bucket,
                key=s3_key,
                extension=ext
            )
            
            uploaded += 1
            uploaded_urls.append(result['Location'])
            print(f"✅ Uploaded {filename}", file=sys.stderr)
            
        except Exception as e:
            failed += 1
            error_msg = f"Failed to upload {local_path.name}: {str(e)}"
            errors.append(error_msg)
            print(f"❌ {error_msg}", file=sys.stderr)
    
    result = {
        'uploaded': uploaded,
        'failed': failed,
        'total': len(image_files),
        'errors': errors,
        's3_urls': uploaded_urls
    }
    
    # Update response.json with new URLs
    if uploaded > 0:
        try:
            response_file = local_dir / 'response.json'
            if response_file.exists():
                with open(response_file, 'r') as f:
                    response_data = json.load(f)
                
                # Update S3 URLs
                if 'output' in response_data and 'output' in response_data['output']:
                    response_data['output']['output']['s3_image_urls'] = uploaded_urls
                    
                    with open(response_file, 'w') as f:
                        json.dump(response_data, f, indent=2)
                    
                    print(f"📝 Updated response.json with {len(uploaded_urls)} URLs", file=sys.stderr)
        except Exception as e:
            print(f"⚠️  Failed to update response.json: {str(e)}", file=sys.stderr)
    
    return result

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: sync_actor_training_to_s3.py <actor_name>'}))
        sys.exit(1)
    
    actor_name = sys.argv[1]
    
    try:
        print(f"🚀 Starting upload for {actor_name}", file=sys.stderr)
        
        result = sync_to_s3(actor_name)
        
        if 'error' in result:
            print(f"❌ Error: {result['error']}", file=sys.stderr)
        else:
            print(f"\n✅ Upload complete: {result['uploaded']} uploaded, {result['failed']} failed", file=sys.stderr)
        
        # Output JSON result to stdout
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'uploaded': 0,
            'failed': 0,
            'total': 0
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == '__main__':
    main()
