#!/usr/bin/env python3
"""
Upload images to S3 with metadata tracking.
"""
import sys
import json
import os
import hashlib
from pathlib import Path
from datetime import datetime
import urllib.parse

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.s3 import S3Client


def calculate_md5(file_path):
    """Calculate MD5 hash of a file."""
    hash_md5 = hashlib.md5()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()


def main():
    """Upload images to S3 and return metadata."""
    try:
        data = json.loads(sys.stdin.read())
        style_id = data['styleId']
        images = data['images']
        sync_deletes = data.get('syncDeletes', False)
        bucket = os.getenv("AWS_ASSETS_BUCKET", "storyboard-user-files")
        region = os.getenv("AWS_REGION", "us-west-1")
        
        client = S3Client()
        uploaded = 0
        failed = 0
        uploaded_files = []
        
        print(f"Sync deletes: {sync_deletes}", file=sys.stderr)
        
        for img in images:
            try:
                # Convert web path to filesystem path and decode URL encoding
                local_path = img['localPath'].replace('/resources/', 'resources/')
                local_path = urllib.parse.unquote(local_path)  # Decode %20 -> space, etc.
                file_path = Path(local_path)
                
                if not file_path.exists():
                    print(f"File not found: {file_path}", file=sys.stderr)
                    failed += 1
                    continue
                
                with open(file_path, 'rb') as f:
                    file_data = f.read()
                
                s3_key = f"styles/{style_id}/{img['filename']}"
                ext = img['filename'].split('.')[-1].lower()
                
                # Calculate MD5 before upload
                md5_hash = calculate_md5(file_path)
                file_size = file_path.stat().st_size
                
                # Use appropriate upload method based on file type
                if ext == 'txt':
                    result = client.upload_file(file_data, bucket, s3_key, content_type='text/plain')
                    print(f"Uploaded caption: {img['filename']}", file=sys.stderr)
                else:
                    result = client.upload_image(file_data, bucket, s3_key, extension=ext)
                    print(f"Uploaded image: {img['filename']}", file=sys.stderr)
                
                # Record upload details for manifest
                uploaded_files.append({
                    'filename': img['filename'],
                    's3_key': s3_key,
                    's3_url': f"https://{bucket}.s3.{region}.amazonaws.com/{s3_key}",
                    'size_bytes': file_size,
                    'md5_hash': md5_hash,
                    'uploaded_at': datetime.utcnow().isoformat() + 'Z',
                    'local_path': img['localPath']
                })
                
                uploaded += 1
                
                # Also upload caption file if it exists (only for image files, not txt files)
                if ext != 'txt':
                    caption_filename = file_path.stem + '.txt'
                    caption_path = file_path.parent / caption_filename
                    if caption_path.exists():
                        try:
                            with open(caption_path, 'rb') as f:
                                caption_data = f.read()
                            
                            caption_s3_key = f"styles/{style_id}/{caption_filename}"
                            caption_md5 = calculate_md5(caption_path)
                            caption_size = caption_path.stat().st_size
                            
                            client.upload_file(caption_data, bucket, caption_s3_key, content_type='text/plain')
                            print(f"Uploaded caption: {caption_filename}", file=sys.stderr)
                            
                            uploaded_files.append({
                                'filename': caption_filename,
                                's3_key': caption_s3_key,
                                's3_url': f"https://{bucket}.s3.{region}.amazonaws.com/{caption_s3_key}",
                                'size_bytes': caption_size,
                                'md5_hash': caption_md5,
                                'uploaded_at': datetime.utcnow().isoformat() + 'Z',
                                'local_path': str(caption_path)
                            })
                            uploaded += 1
                        except Exception as e:
                            print(f"Failed to upload caption {caption_filename}: {e}", file=sys.stderr)
            except Exception as e:
                print(f"Failed to upload {img['filename']}: {e}", file=sys.stderr)
                failed += 1
        
        # If syncDeletes is enabled, delete S3 files that don't exist locally
        deleted = 0
        if sync_deletes:
            print("Checking for S3 files to delete...", file=sys.stderr)
            # Get list of local filenames (images + captions)
            local_filenames = set()
            for img in images:
                local_path = img['localPath'].replace('/resources/', 'resources/')
                local_path = urllib.parse.unquote(local_path)
                file_path = Path(local_path)
                if file_path.exists():
                    local_filenames.add(img['filename'])
                    # Also add caption filename if it exists
                    caption_filename = file_path.stem + '.txt'
                    caption_path = file_path.parent / caption_filename
                    if caption_path.exists():
                        local_filenames.add(caption_filename)
            
            # List all files in S3 for this style
            try:
                s3_files = client.list_files(bucket, f"styles/{style_id}/")
                for s3_file in s3_files:
                    s3_key = s3_file['Key']
                    s3_filename = s3_key.split('/')[-1]
                    
                    if s3_filename and s3_filename not in local_filenames:
                        try:
                            client.delete_file(bucket, s3_key)
                            print(f"Deleted from S3 (not in local): {s3_filename}", file=sys.stderr)
                            deleted += 1
                        except Exception as e:
                            print(f"Failed to delete {s3_filename} from S3: {e}", file=sys.stderr)
            except Exception as e:
                print(f"Failed to list S3 files for deletion check: {e}", file=sys.stderr)
        
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
