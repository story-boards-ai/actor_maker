#!/usr/bin/env python3
"""
Delete images from S3.
"""
import sys
import json
import os
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.s3 import S3Client


def main():
    """Delete files from S3."""
    try:
        data = json.loads(sys.stdin.read())
        style_id = data['styleId']
        filenames = data['filenames']
        bucket = os.getenv("AWS_ASSETS_BUCKET", "storyboard-user-files")
        
        client = S3Client()
        deleted = 0
        failed = 0
        
        for filename in filenames:
            try:
                s3_key = f"styles/{style_id}/{filename}"
                client.delete_file(bucket, s3_key)
                print(f"Deleted: {filename}", file=sys.stderr)
                deleted += 1
            except Exception as e:
                print(f"Failed to delete {filename}: {e}", file=sys.stderr)
                failed += 1
        
        print(json.dumps({"deleted": deleted, "failed": failed}))
        
    except Exception as e:
        print(json.dumps({"error": str(e), "deleted": 0, "failed": 0}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
