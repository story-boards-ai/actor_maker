#!/usr/bin/env python3
"""
Delete a training image from both local storage and S3.
"""
import sys
import json
import os
from pathlib import Path
from urllib.parse import urlparse

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.utils.s3 import S3Client

def parse_s3_url(url: str) -> tuple[str, str]:
    """Parse S3 URL to extract bucket and key."""
    parsed = urlparse(url)
    
    # Handle both formats:
    # https://bucket.s3.region.amazonaws.com/path/file.png
    # https://bucket.s3-accelerate.amazonaws.com/path/file.png
    hostname_parts = parsed.hostname.split('.')
    bucket = hostname_parts[0]
    key = parsed.path.lstrip('/')
    
    return bucket, key

def delete_training_image(actor_name: str, filename: str, s3_url: str) -> dict:
    """
    Delete training image from local storage and S3.
    
    Args:
        actor_name: Name of the actor
        filename: Filename of the image to delete
        s3_url: S3 URL of the image
    
    Returns:
        Dict with deletion results
    """
    deleted_local = False
    deleted_s3 = False
    errors = []
    
    # Delete from local storage
    try:
        local_path = project_root / 'data' / 'actors' / actor_name / 'training_data' / filename
        if local_path.exists():
            local_path.unlink()
            deleted_local = True
            print(f"✅ Deleted local file: {filename}", file=sys.stderr)
        else:
            print(f"⏭️  Local file not found: {filename}", file=sys.stderr)
    except Exception as e:
        error_msg = f"Failed to delete local file: {str(e)}"
        errors.append(error_msg)
        print(f"❌ {error_msg}", file=sys.stderr)
    
    # Delete from S3
    try:
        s3_client = S3Client()
        bucket, key = parse_s3_url(s3_url)
        
        # Check if exists before deleting
        if s3_client.file_exists(bucket, key):
            s3_client.delete_file(bucket, key)
            deleted_s3 = True
            print(f"✅ Deleted from S3: {filename}", file=sys.stderr)
        else:
            print(f"⏭️  S3 file not found: {filename}", file=sys.stderr)
    except Exception as e:
        error_msg = f"Failed to delete from S3: {str(e)}"
        errors.append(error_msg)
        print(f"❌ {error_msg}", file=sys.stderr)
    
    # Update response.json to remove the URL
    try:
        response_file = project_root / 'data' / 'actors' / actor_name / 'training_data' / 'response.json'
        if response_file.exists():
            with open(response_file, 'r') as f:
                response_data = json.load(f)
            
            # Remove URL from s3_image_urls
            if 'output' in response_data and 'output' in response_data['output']:
                s3_urls = response_data['output']['output'].get('s3_image_urls', [])
                if s3_url in s3_urls:
                    s3_urls.remove(s3_url)
                    response_data['output']['output']['s3_image_urls'] = s3_urls
                    
                    with open(response_file, 'w') as f:
                        json.dump(response_data, f, indent=2)
                    
                    print(f"📝 Updated response.json", file=sys.stderr)
    except Exception as e:
        print(f"⚠️  Failed to update response.json: {str(e)}", file=sys.stderr)
    
    result = {
        'deleted': deleted_local or deleted_s3,
        'deleted_local': deleted_local,
        'deleted_s3': deleted_s3,
        'filename': filename,
        'errors': errors
    }
    
    return result

def main():
    if len(sys.argv) < 4:
        print(json.dumps({'error': 'Usage: delete_actor_training_image.py <actor_name> <filename> <s3_url>'}))
        sys.exit(1)
    
    actor_name = sys.argv[1]
    filename = sys.argv[2]
    s3_url = sys.argv[3]
    
    try:
        print(f"🗑️  Deleting {filename} for {actor_name}", file=sys.stderr)
        
        result = delete_training_image(actor_name, filename, s3_url)
        
        if result['deleted']:
            print(f"\n✅ Delete complete", file=sys.stderr)
        else:
            print(f"\n⚠️  Nothing was deleted", file=sys.stderr)
        
        # Output JSON result to stdout
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'deleted': False,
            'deleted_local': False,
            'deleted_s3': False
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == '__main__':
    main()
