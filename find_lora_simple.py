#!/usr/bin/env python3
"""
Search for all LoRA files in the S3 bucket's style maker user folder.
"""
import os
import boto3
from botocore.exceptions import ClientError
from pathlib import Path

# Load .env file if it exists
env_file = Path(__file__).parent / '.env'
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                # Remove quotes if present
                value = value.strip().strip('"').strip("'")
                os.environ[key.strip()] = value

def find_lora_files():
    """Find all LoRA files in the storyboard-user-files bucket."""
    
    # Get credentials from environment
    access_key = os.getenv("AWS_ACCESS_KEY")
    secret_key = os.getenv("AWS_ACCESS_SECRET")
    region = os.getenv("AWS_REGION", "us-west-1")
    
    if not access_key or not secret_key:
        print("❌ Error: AWS_ACCESS_KEY and AWS_ACCESS_SECRET environment variables required")
        return []
    
    # Initialize S3 client
    s3 = boto3.client(
        's3',
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region
    )
    
    bucket = "storyboard-user-files"
    
    print(f"🔍 Listing folders in S3 bucket: {bucket}")
    print("=" * 80)
    
    # First list top-level folders
    try:
        print("\n📁 Top-level folders:")
        response = s3.list_objects_v2(
            Bucket=bucket,
            Delimiter='/',
            MaxKeys=1000
        )
        
        prefixes = response.get('CommonPrefixes', [])
        for p in prefixes:
            print(f"  - {p['Prefix']}")
        
        print(f"\nTotal: {len(prefixes)} folders")
    except Exception as e:
        print(f"❌ Error listing folders: {e}")
        return []
    
    # Now search for style_maker_user
    prefix = "style_maker_user/"
    
    print(f"\n\n🔍 Searching for LoRA files in: {prefix}")
    print("=" * 80)
    
    all_lora_files = []
    
    try:
        # Use paginator to handle large result sets
        paginator = s3.get_paginator('list_objects_v2')
        page_iterator = paginator.paginate(
            Bucket=bucket,
            Prefix=prefix
        )
        
        file_count = 0
        lora_count = 0
        
        print(f"\n📂 Scanning all files in {prefix}...\n")
        
        for page in page_iterator:
            files = page.get('Contents', [])
            file_count += len(files)
            
            # Filter for LoRA files (.safetensors, .pt, .ckpt, .pth)
            lora_extensions = ['.safetensors', '.pt', '.ckpt', '.pth']
            
            for file_info in files:
                key = file_info['Key']
                
                # Check if it's a LoRA file
                if any(key.lower().endswith(ext) for ext in lora_extensions):
                    lora_count += 1
                    all_lora_files.append({
                        'key': key,
                        'size': file_info['Size'],
                        'last_modified': file_info['LastModified'],
                        'url': f"https://{bucket}.s3.{region}.amazonaws.com/{key}"
                    })
                    size_mb = file_info['Size'] / (1024 * 1024)
                    print(f"  ✅ {key} ({size_mb:.2f} MB)")
        
        print(f"\n📊 Scanned {file_count} total files, found {lora_count} LoRA files")
                        
    except Exception as e:
        print(f"❌ Error: {e}")
        return []
    
    # Print results
    print("\n\n" + "=" * 80)
    print(f"📊 RESULTS: Found {len(all_lora_files)} LoRA files")
    print("=" * 80)
    
    if all_lora_files:
        # Sort by path
        all_lora_files.sort(key=lambda x: x['key'])
        
        print("\n📋 Detailed List:\n")
        for i, file_info in enumerate(all_lora_files, 1):
            size_mb = file_info['size'] / (1024 * 1024)
            print(f"{i}. {file_info['key']}")
            print(f"   Size: {size_mb:.2f} MB")
            print(f"   Modified: {file_info['last_modified']}")
            print(f"   URL: {file_info['url']}")
            print()
    else:
        print("\n❌ No LoRA files found")
    
    return all_lora_files


if __name__ == "__main__":
    try:
        files = find_lora_files()
        
        # Save to file
        if files:
            output_file = "lora_files_found.txt"
            with open(output_file, 'w') as f:
                f.write("LoRA Files Found in S3\n")
                f.write("=" * 80 + "\n\n")
                
                for file_info in files:
                    size_mb = file_info['size'] / (1024 * 1024)
                    f.write(f"Path: {file_info['key']}\n")
                    f.write(f"Size: {size_mb:.2f} MB\n")
                    f.write(f"Modified: {file_info['last_modified']}\n")
                    f.write(f"URL: {file_info['url']}\n")
                    f.write("\n" + "-" * 80 + "\n\n")
            
            print(f"✅ Results saved to: {output_file}")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
