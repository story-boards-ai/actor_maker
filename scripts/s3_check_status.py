#!/usr/bin/env python3
"""
Check S3 status for a style - list all files in S3 for a given style.
"""
import sys
import json
import os
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.s3 import S3Client


def main():
    """List files in S3 for a style with metadata for hash comparison."""
    try:
        # Read arguments from stdin
        data = json.loads(sys.stdin.read())
        style_id = data['styleId']
        bucket = os.getenv("AWS_ASSETS_BUCKET", "storyboard-user-files")
        prefix = f"styles/{style_id}/"
        
        client = S3Client()
        files = client.list_files(bucket, prefix)
        
        # Build file map with metadata for hash comparison
        file_map = {}
        for f in files:
            filename = f['Key'].split('/')[-1]
            file_map[filename] = {
                'etag': f['ETag'].strip('"'),  # Remove quotes from ETag
                'size': f['Size'],
                'lastModified': f.get('LastModified', '').isoformat() if hasattr(f.get('LastModified', ''), 'isoformat') else str(f.get('LastModified', ''))
            }
        
        # Also return simple filename list for backwards compatibility
        filenames = list(file_map.keys())
        
        print(json.dumps({
            "files": filenames,
            "fileMap": file_map,
            "count": len(filenames)
        }))
        
    except Exception as e:
        print(json.dumps({"error": str(e), "files": [], "fileMap": {}}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
