#!/usr/bin/env python3
"""
Search for all LoRA files across all user folders in S3.
"""
import os
import boto3
from pathlib import Path

# Load .env file
env_file = Path(__file__).parent / '.env'
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                value = value.strip().strip('"').strip("'")
                os.environ[key.strip()] = value

# Get credentials
access_key = os.getenv("AWS_ACCESS_KEY")
secret_key = os.getenv("AWS_ACCESS_SECRET")
region = os.getenv("AWS_REGION", "us-west-1")

if not access_key or not secret_key:
    print("❌ Error: AWS credentials required")
    exit(1)

# Initialize S3
s3 = boto3.client(
    's3',
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    region_name=region
)

bucket = "storyboard-user-files"

print(f"🔍 Searching ALL user folders for LoRA files with 'style' in path")
print("=" * 80)

all_lora_files = []
lora_extensions = ['.safetensors', '.pt', '.ckpt', '.pth']

# Use paginator to scan entire bucket
paginator = s3.get_paginator('list_objects_v2')
page_iterator = paginator.paginate(Bucket=bucket)

file_count = 0
lora_count = 0

print("\n📂 Scanning bucket (this may take a while)...\n")

for page in page_iterator:
    files = page.get('Contents', [])
    file_count += len(files)
    
    for file_info in files:
        key = file_info['Key']
        
        # Check if it's a LoRA file
        if any(key.lower().endswith(ext) for ext in lora_extensions):
            # Check if it has 'style' in the path
            if 'style' in key.lower():
                lora_count += 1
                size_mb = file_info['Size'] / (1024 * 1024)
                
                all_lora_files.append({
                    'key': key,
                    'size': file_info['Size'],
                    'last_modified': file_info['LastModified'],
                    'url': f"https://{bucket}.s3.{region}.amazonaws.com/{key}"
                })
                
                print(f"  ✅ {key} ({size_mb:.2f} MB)")
    
    if file_count % 1000 == 0:
        print(f"  ... scanned {file_count} files, found {lora_count} LoRA files so far")

print(f"\n\n📊 Total scanned: {file_count} files")
print(f"📊 Found: {lora_count} LoRA files with 'style' in path")
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
    
    # Save to file
    output_file = "all_style_lora_files.txt"
    with open(output_file, 'w') as f:
        f.write("LoRA Files with 'style' in path - Found in S3\n")
        f.write("=" * 80 + "\n\n")
        
        for file_info in all_lora_files:
            size_mb = file_info['size'] / (1024 * 1024)
            f.write(f"Path: {file_info['key']}\n")
            f.write(f"Size: {size_mb:.2f} MB\n")
            f.write(f"Modified: {file_info['last_modified']}\n")
            f.write(f"URL: {file_info['url']}\n")
            f.write("\n" + "-" * 80 + "\n\n")
    
    print(f"✅ Results saved to: {output_file}")
else:
    print("\n❌ No LoRA files found with 'style' in path")
