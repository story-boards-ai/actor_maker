#!/usr/bin/env python3
"""
Fast S3 sync using parallel uploads with ThreadPoolExecutor.
Up to 20x faster than sequential uploads.
"""
import sys
import json
import os
import hashlib
from pathlib import Path
from datetime import datetime
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.s3 import S3Client


def calculate_md5(file_path: Path) -> str:
    """Calculate MD5 hash of a file."""
    hash_md5 = hashlib.md5()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()


def upload_single_file(
    file_info: Dict[str, Any],
    style_id: str,
    bucket: str,
    region: str,
    client: S3Client
) -> Dict[str, Any]:
    """Upload a single file to S3. Returns upload result."""
    try:
        # Convert web path to filesystem path and decode URL encoding
        local_path = file_info['localPath'].replace('/resources/', 'resources/')
        local_path = urllib.parse.unquote(local_path)
        file_path = Path(local_path)
        
        if not file_path.exists():
            return {
                'success': False,
                'filename': file_info['filename'],
                'error': 'File not found'
            }
        
        # Read file data
        with open(file_path, 'rb') as f:
            file_data = f.read()
        
        s3_key = f"styles/{style_id}/{file_info['filename']}"
        ext = file_info['filename'].split('.')[-1].lower()
        
        # Calculate MD5 and size
        md5_hash = calculate_md5(file_path)
        file_size = file_path.stat().st_size
        
        # Upload based on file type
        if ext == 'txt':
            client.upload_file(file_data, bucket, s3_key, content_type='text/plain')
        else:
            client.upload_image(file_data, bucket, s3_key, extension=ext)
        
        return {
            'success': True,
            'filename': file_info['filename'],
            's3_key': s3_key,
            's3_url': f"https://{bucket}.s3.{region}.amazonaws.com/{s3_key}",
            'size_bytes': file_size,
            'md5_hash': md5_hash,
            'uploaded_at': datetime.utcnow().isoformat() + 'Z',
            'local_path': file_info['localPath']
        }
        
    except Exception as e:
        return {
            'success': False,
            'filename': file_info.get('filename', 'unknown'),
            'error': str(e)
        }


def main():
    """Upload images to S3 in parallel."""
    try:
        data = json.loads(sys.stdin.read())
        style_id = data['styleId']
        images = data['images']
        sync_deletes = data.get('syncDeletes', False)
        max_workers = data.get('maxWorkers', 20)  # Configurable concurrency
        bucket = os.getenv("AWS_ASSETS_BUCKET", "storyboard-user-files")
        region = os.getenv("AWS_REGION", "us-west-1")
        
        # Create S3 client (will be shared across threads - boto3 is thread-safe)
        client = S3Client()
        
        uploaded = 0
        failed = 0
        uploaded_files = []
        
        print(f"Starting parallel upload with {max_workers} workers...", file=sys.stderr)
        print(f"Total files to upload: {len(images)}", file=sys.stderr)
        
        # Upload files in parallel using ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all upload tasks
            future_to_file = {
                executor.submit(
                    upload_single_file,
                    img,
                    style_id,
                    bucket,
                    region,
                    client
                ): img for img in images
            }
            
            # Process completed uploads as they finish
            for future in as_completed(future_to_file):
                result = future.result()
                
                if result['success']:
                    uploaded += 1
                    uploaded_files.append({
                        'filename': result['filename'],
                        's3_key': result['s3_key'],
                        's3_url': result['s3_url'],
                        'size_bytes': result['size_bytes'],
                        'md5_hash': result['md5_hash'],
                        'uploaded_at': result['uploaded_at'],
                        'local_path': result['local_path']
                    })
                    print(f"✓ Uploaded ({uploaded}/{len(images)}): {result['filename']}", file=sys.stderr)
                else:
                    failed += 1
                    print(f"✗ Failed: {result['filename']} - {result.get('error', 'Unknown error')}", file=sys.stderr)
        
        print(f"\nUpload complete: {uploaded} succeeded, {failed} failed", file=sys.stderr)
        
        # Handle deletions if requested
        deleted = 0
        if sync_deletes:
            print("\nChecking for S3 files to delete...", file=sys.stderr)
            local_filenames = set(img['filename'] for img in images)
            
            try:
                s3_files = client.list_files(bucket, f"styles/{style_id}/")
                files_to_delete = []
                
                for s3_file in s3_files:
                    s3_key = s3_file['Key']
                    s3_filename = s3_key.split('/')[-1]
                    
                    if s3_filename and s3_filename not in local_filenames:
                        files_to_delete.append(s3_key)
                
                # Delete in parallel too
                if files_to_delete:
                    print(f"Deleting {len(files_to_delete)} files from S3...", file=sys.stderr)
                    with ThreadPoolExecutor(max_workers=10) as executor:
                        delete_futures = [
                            executor.submit(client.delete_file, bucket, key)
                            for key in files_to_delete
                        ]
                        for future in as_completed(delete_futures):
                            try:
                                future.result()
                                deleted += 1
                            except Exception as e:
                                print(f"Delete failed: {e}", file=sys.stderr)
                    
                    print(f"Deleted {deleted} files from S3", file=sys.stderr)
                    
            except Exception as e:
                print(f"Failed to list/delete S3 files: {e}", file=sys.stderr)
        
        # Return results
        print(json.dumps({
            "uploaded": uploaded,
            "failed": failed,
            "deleted": deleted,
            "uploaded_files": uploaded_files
        }))
        
    except Exception as e:
        print(json.dumps({"error": str(e), "uploaded": 0, "failed": 0}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
