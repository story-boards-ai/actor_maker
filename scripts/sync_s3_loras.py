#!/usr/bin/env python3
"""
Sync LoRA files from S3 bucket.
Outputs JSON to stdout for consumption by Node.js API.
"""
import os
import sys
import json
from pathlib import Path

# Add parent directory to path to import utils
parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

try:
    import boto3
    from botocore.exceptions import ClientError
except ImportError:
    print(json.dumps({"error": "boto3 not installed"}), file=sys.stderr)
    sys.exit(1)

# Load .env file if it exists
env_file = parent_dir / '.env'
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                value = value.strip().strip('"').strip("'")
                os.environ[key.strip()] = value

def sync_s3_loras():
    """Find all LoRA files in S3 and return as JSON."""
    
    # Get credentials
    access_key = os.getenv("AWS_ACCESS_KEY")
    secret_key = os.getenv("AWS_ACCESS_SECRET")
    region = os.getenv("AWS_REGION", "us-west-1")
    
    if not access_key or not secret_key:
        return {"error": "AWS credentials not found", "files": []}
    
    # Initialize S3
    s3 = boto3.client(
        's3',
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region
    )
    
    bucket = "storyboard-user-files"
    prefix = "actor_maker_user/custom-styles-models/"
    
    lora_files = []
    
    try:
        # List all files in the prefix
        paginator = s3.get_paginator('list_objects_v2')
        page_iterator = paginator.paginate(
            Bucket=bucket,
            Prefix=prefix
        )
        
        for page in page_iterator:
            files = page.get('Contents', [])
            
            for file_info in files:
                key = file_info['Key']
                
                # Only include .safetensors files
                if key.lower().endswith('.safetensors'):
                    filename = key.split('/')[-1]  # Get just the filename
                    
                    lora_files.append({
                        'filename': filename,
                        'key': key,
                        'size': file_info['Size'],
                        'last_modified': file_info['LastModified'].isoformat(),
                        'url': f"https://{bucket}.s3.{region}.amazonaws.com/{key}"
                    })
        
        return {
            "success": True,
            "files": lora_files,
            "count": len(lora_files)
        }
        
    except ClientError as e:
        return {
            "error": f"S3 error: {str(e)}",
            "files": []
        }
    except Exception as e:
        return {
            "error": f"Unexpected error: {str(e)}",
            "files": []
        }

if __name__ == "__main__":
    result = sync_s3_loras()
    # Output JSON to stdout for Node.js to parse
    print(json.dumps(result))
