#!/usr/bin/env python3
"""
Compare local files with S3 to detect differences.
"""
import sys
import json
import os
import hashlib
from pathlib import Path
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
    """Compare local files with S3 versions."""
    try:
        data = json.loads(sys.stdin.read())
        style_id = data['styleId']
        local_images = data['localImages']
        bucket = os.getenv("AWS_ASSETS_BUCKET", "storyboard-user-files")
        
        client = S3Client()
        
        # Get all S3 files for this style
        prefix = f"styles/{style_id}/"
        s3_files = client.list_files(bucket, prefix)
        s3_file_map = {f['Key'].split('/')[-1]: f for f in s3_files}
        
        results = {
            "missing_in_s3": [],      # Local files not in S3
            "missing_locally": [],    # S3 files not local
            "different": [],          # Files that exist but are different
            "identical": [],          # Files that are identical
            "errors": []              # Files that couldn't be compared
        }
        
        # Compare local files with S3
        for img in local_images:
            try:
                local_path = img['localPath'].replace('/resources/', 'resources/')
                local_path = urllib.parse.unquote(local_path)
                file_path = Path(local_path)
                filename = img['filename']
                
                if not file_path.exists():
                    results['errors'].append({
                        'filename': filename,
                        'error': 'Local file not found'
                    })
                    continue
                
                # Check if file exists in S3
                if filename not in s3_file_map:
                    results['missing_in_s3'].append({
                        'filename': filename,
                        'localPath': img['localPath'],
                        'size': file_path.stat().st_size
                    })
                    continue
                
                # File exists in both - compare sizes and ETags
                s3_file = s3_file_map[filename]
                local_size = file_path.stat().st_size
                s3_size = s3_file['Size']
                
                # Quick check: if sizes differ, files are different
                if local_size != s3_size:
                    results['different'].append({
                        'filename': filename,
                        'localPath': img['localPath'],
                        'localSize': local_size,
                        's3Size': s3_size,
                        'reason': 'size_mismatch'
                    })
                    continue
                
                # Sizes match - compare MD5 hashes
                local_md5 = calculate_md5(file_path)
                s3_etag = s3_file['ETag'].strip('"')
                
                if local_md5 == s3_etag:
                    results['identical'].append({
                        'filename': filename,
                        'size': local_size
                    })
                else:
                    results['different'].append({
                        'filename': filename,
                        'localPath': img['localPath'],
                        'localSize': local_size,
                        's3Size': s3_size,
                        'reason': 'content_mismatch',
                        'localMd5': local_md5,
                        's3Etag': s3_etag
                    })
            except Exception as e:
                results['errors'].append({
                    'filename': img.get('filename', 'unknown'),
                    'error': str(e)
                })
        
        # Find S3 files that don't exist locally
        local_filenames = {img['filename'] for img in local_images}
        for s3_filename in s3_file_map.keys():
            if s3_filename not in local_filenames:
                results['missing_locally'].append({
                    'filename': s3_filename,
                    's3Key': s3_file_map[s3_filename]['Key'],
                    'size': s3_file_map[s3_filename]['Size']
                })
        
        # Add summary counts
        results['summary'] = {
            'total_local': len(local_images),
            'total_s3': len(s3_file_map),
            'missing_in_s3': len(results['missing_in_s3']),
            'missing_locally': len(results['missing_locally']),
            'different': len(results['different']),
            'identical': len(results['identical']),
            'errors': len(results['errors'])
        }
        
        print(json.dumps(results))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
