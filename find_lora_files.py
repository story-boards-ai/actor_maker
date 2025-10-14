#!/usr/bin/env python3
"""
Search for all LoRA files in the S3 bucket's style maker user folder.
"""
import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from utils.s3 import S3Client

def find_lora_files():
    """Find all LoRA files in the storyboard-user-files bucket."""
    
    # Initialize S3 client
    client = S3Client()
    
    bucket = "storyboard-user-files"
    
    # Search patterns for style maker folders
    search_prefixes = [
        "style_maker/",
        "stylemaker/",
        "actor_maker/",
        "stylesmaker/",
    ]
    
    # Also search all user folders for style-related paths
    print("🔍 Searching for LoRA files in S3 bucket: storyboard-user-files")
    print("=" * 80)
    
    all_lora_files = []
    
    # First, try to list all top-level folders to find user folders
    try:
        print("\n📁 Listing top-level structure...")
        response = client.s3.list_objects_v2(
            Bucket=bucket,
            Delimiter='/',
            MaxKeys=100
        )
        
        prefixes = response.get('CommonPrefixes', [])
        print(f"Found {len(prefixes)} top-level folders")
        
        # Search each user folder for style-related content
        for prefix_info in prefixes:
            prefix = prefix_info['Prefix']
            print(f"\n🔎 Checking: {prefix}")
            
            # List all files recursively in this prefix
            try:
                files = client.list_files(bucket, prefix, max_keys=10000)
                
                # Filter for LoRA files (.safetensors, .pt, .ckpt, .pth)
                lora_extensions = ['.safetensors', '.pt', '.ckpt', '.pth']
                
                for file_info in files:
                    key = file_info['Key']
                    
                    # Check if it's a LoRA file
                    if any(key.lower().endswith(ext) for ext in lora_extensions):
                        # Check if it's in a style-related path
                        key_lower = key.lower()
                        if any(term in key_lower for term in ['style', 'lora', 'model']):
                            all_lora_files.append({
                                'key': key,
                                'size': file_info['Size'],
                                'last_modified': file_info['LastModified'],
                                'url': f"https://{bucket}.s3.us-west-1.amazonaws.com/{key}"
                            })
                            
            except Exception as e:
                print(f"  ⚠️  Error listing files in {prefix}: {e}")
                
    except Exception as e:
        print(f"❌ Error listing top-level folders: {e}")
    
    # Also try specific style_maker prefixes
    print("\n\n🔍 Searching specific style_maker prefixes...")
    print("=" * 80)
    
    for prefix in search_prefixes:
        print(f"\n📂 Searching: {prefix}")
        try:
            files = client.list_files(bucket, prefix, max_keys=10000)
            
            if not files:
                print(f"  No files found")
                continue
                
            print(f"  Found {len(files)} total files")
            
            # Filter for LoRA files
            lora_extensions = ['.safetensors', '.pt', '.ckpt', '.pth']
            
            for file_info in files:
                key = file_info['Key']
                
                if any(key.lower().endswith(ext) for ext in lora_extensions):
                    # Check if already added
                    if not any(f['key'] == key for f in all_lora_files):
                        all_lora_files.append({
                            'key': key,
                            'size': file_info['Size'],
                            'last_modified': file_info['LastModified'],
                            'url': f"https://{bucket}.s3.us-west-1.amazonaws.com/{key}"
                        })
                        
        except Exception as e:
            print(f"  ⚠️  Error: {e}")
    
    # Print results
    print("\n\n" + "=" * 80)
    print(f"📊 RESULTS: Found {len(all_lora_files)} LoRA files")
    print("=" * 80)
    
    if all_lora_files:
        # Sort by path
        all_lora_files.sort(key=lambda x: x['key'])
        
        for i, file_info in enumerate(all_lora_files, 1):
            size_mb = file_info['size'] / (1024 * 1024)
            print(f"\n{i}. {file_info['key']}")
            print(f"   Size: {size_mb:.2f} MB")
            print(f"   Modified: {file_info['last_modified']}")
            print(f"   URL: {file_info['url']}")
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
            
            print(f"\n✅ Results saved to: {output_file}")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
