#!/usr/bin/env python3
"""
Sync actor training images from S3 to local storage.
Downloads training images from S3 URLs and saves them locally.
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

def sync_from_s3(actor_name: str, s3_urls: list[str]) -> dict:
    """
    Download training images from S3 to local storage.
    
    Args:
        actor_name: Name of the actor (e.g., "0002_european_35_female")
        s3_urls: List of S3 URLs to download
    
    Returns:
        Dict with download results
    """
    # Initialize S3 client
    s3_client = S3Client()
    
    # Create local directory
    local_dir = project_root / 'data' / 'actors' / actor_name / 'training_data'
    local_dir.mkdir(parents=True, exist_ok=True)
    
    downloaded = 0
    failed = 0
    errors = []
    
    for url in s3_urls:
        try:
            # Parse S3 URL
            bucket, key = parse_s3_url(url)
            
            # Extract filename
            filename = key.split('/')[-1]
            local_path = local_dir / filename
            
            # Skip if already exists
            if local_path.exists():
                print(f"⏭️  Skipping {filename} (already exists)", file=sys.stderr)
                downloaded += 1
                continue
            
            # Download from S3
            print(f"⬇️  Downloading {filename}...", file=sys.stderr)
            file_data = s3_client.download_file(bucket, key)
            
            # Save locally
            with open(local_path, 'wb') as f:
                f.write(file_data)
            
            downloaded += 1
            print(f"✅ Downloaded {filename}", file=sys.stderr)
            
        except Exception as e:
            failed += 1
            error_msg = f"Failed to download {url}: {str(e)}"
            errors.append(error_msg)
            print(f"❌ {error_msg}", file=sys.stderr)
    
    result = {
        'downloaded': downloaded,
        'failed': failed,
        'total': len(s3_urls),
        'errors': errors
    }
    
    return result

def main():
    if len(sys.argv) < 3:
        print(json.dumps({'error': 'Usage: sync_actor_training_from_s3.py <actor_name> <s3_urls_json>'}))
        sys.exit(1)
    
    actor_name = sys.argv[1]
    s3_urls_json = sys.argv[2]
    
    try:
        s3_urls = json.loads(s3_urls_json)
        
        print(f"🚀 Starting sync for {actor_name}", file=sys.stderr)
        print(f"📦 {len(s3_urls)} images to download", file=sys.stderr)
        
        result = sync_from_s3(actor_name, s3_urls)
        
        print(f"\n✅ Sync complete: {result['downloaded']} downloaded, {result['failed']} failed", file=sys.stderr)
        
        # Output JSON result to stdout
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'downloaded': 0,
            'failed': 0,
            'total': 0
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == '__main__':
    main()
