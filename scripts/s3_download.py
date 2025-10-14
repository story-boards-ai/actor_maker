#!/usr/bin/env python3
"""
Download all images from S3 for a style.
"""
import sys
import json
import os
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.s3 import S3Client


def main():
    """Download all files from S3 for a style."""
    try:
        data = json.loads(sys.stdin.read())
        style_id = data['styleId']
        local_dir = Path(data['localDir'])
        sync_deletes = data.get('syncDeletes', False)
        bucket = os.getenv("AWS_ASSETS_BUCKET", "storyboard-user-files")
        prefix = f"styles/{style_id}/"
        
        # Create local directory if it doesn't exist
        local_dir.mkdir(parents=True, exist_ok=True)
        
        client = S3Client()
        files = client.list_files(bucket, prefix)
        
        downloaded = 0
        failed = 0
        deleted = 0
        
        print(f"Sync deletes: {sync_deletes}", file=sys.stderr)
        
        # Get list of S3 filenames
        s3_filenames = set()
        for file_obj in files:
            s3_key = file_obj['Key']
            filename = s3_key.split('/')[-1]
            s3_filenames.add(filename)
        
        for file_obj in files:
            try:
                s3_key = file_obj['Key']
                filename = s3_key.split('/')[-1]
                local_path = local_dir / filename
                
                # Download file
                file_data = client.download_file(bucket, s3_key)
                
                # Save to local disk
                with open(local_path, 'wb') as f:
                    f.write(file_data)
                
                print(f"Downloaded: {filename}", file=sys.stderr)
                downloaded += 1
            except Exception as e:
                print(f"Failed to download {s3_key}: {e}", file=sys.stderr)
                failed += 1
        
        # If syncDeletes is enabled, delete local files that don't exist in S3
        if sync_deletes:
            print("Checking for local files to delete...", file=sys.stderr)
            for local_file in local_dir.iterdir():
                if local_file.is_file() and local_file.name not in s3_filenames:
                    try:
                        local_file.unlink()
                        print(f"Deleted local file (not in S3): {local_file.name}", file=sys.stderr)
                        deleted += 1
                    except Exception as e:
                        print(f"Failed to delete {local_file.name}: {e}", file=sys.stderr)
        
        print(json.dumps({"downloaded": downloaded, "failed": failed, "deleted": deleted}))
        
    except Exception as e:
        print(json.dumps({"error": str(e), "downloaded": 0, "failed": 0}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
