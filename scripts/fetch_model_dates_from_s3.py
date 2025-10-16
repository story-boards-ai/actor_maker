#!/usr/bin/env python3
"""
Script to fetch safetensors model creation dates from S3 and update actorsData.ts
"""

import boto3
import json
import re
from datetime import datetime
from pathlib import Path

# S3 Configuration
S3_BUCKET = "story-boards-assets"
S3_PREFIX = "system_actors/lora_models/"

def get_s3_client():
    """Initialize S3 client"""
    return boto3.client('s3')

def fetch_model_dates():
    """Fetch creation dates for all safetensors files from S3"""
    s3 = get_s3_client()
    model_dates = {}
    
    try:
        # List all objects in the lora_models directory
        response = s3.list_objects_v2(
            Bucket=S3_BUCKET,
            Prefix=S3_PREFIX
        )
        
        if 'Contents' not in response:
            print(f"No files found in s3://{S3_BUCKET}/{S3_PREFIX}")
            return model_dates
        
        for obj in response['Contents']:
            key = obj['Key']
            if key.endswith('.safetensors'):
                # Extract model name from key
                model_name = key.replace(S3_PREFIX, '').replace('.safetensors', '')
                
                # Get the LastModified date
                last_modified = obj['LastModified']
                
                model_dates[model_name] = {
                    'last_modified': last_modified.isoformat(),
                    'last_modified_timestamp': last_modified.timestamp(),
                    'size_bytes': obj['Size'],
                    's3_key': key
                }
                
                print(f"✓ {model_name}: {last_modified.strftime('%Y-%m-%d %H:%M:%S')}")
        
        print(f"\n✓ Found {len(model_dates)} model files")
        return model_dates
        
    except Exception as e:
        print(f"Error fetching from S3: {e}")
        return {}

def update_actors_data(model_dates):
    """Update actorsData.ts with model creation dates"""
    actors_data_path = Path(__file__).parent.parent / "data" / "actorsData.ts"
    
    if not actors_data_path.exists():
        print(f"Error: {actors_data_path} not found")
        return False
    
    # Read the current file
    with open(actors_data_path, 'r') as f:
        content = f.read()
    
    # Parse the actors array
    # Find each actor object and add model_created_at field
    updated_content = content
    
    for model_name, date_info in model_dates.items():
        # Try to match by ID (e.g., "0000" from "0000.safetensors")
        # or by full name (e.g., "0001_european_20_female")
        
        # Pattern to find the actor object
        patterns = [
            # Match by ID at start of object
            rf'(\{{\s*"id":\s*{model_name},)',
            # Match by name field
            rf'("name":\s*"{model_name}")',
        ]
        
        for pattern in patterns:
            matches = list(re.finditer(pattern, updated_content))
            if matches:
                # Find the closing brace of this object
                for match in matches:
                    start_pos = match.start()
                    
                    # Find the "url" field in this object
                    url_pattern = rf'"url":\s*"[^"]*{re.escape(model_name)}[^"]*\.safetensors"'
                    url_match = re.search(url_pattern, updated_content[start_pos:start_pos+2000])
                    
                    if url_match:
                        # Insert model_created_at after the url field
                        insert_pos = start_pos + url_match.end()
                        
                        # Check if model_created_at already exists
                        if '"model_created_at"' not in updated_content[start_pos:insert_pos+200]:
                            date_str = date_info['last_modified']
                            new_field = f',\n    "model_created_at": "{date_str}"'
                            updated_content = updated_content[:insert_pos] + new_field + updated_content[insert_pos:]
                            print(f"✓ Added model_created_at for {model_name}")
                break
    
    # Write the updated content
    with open(actors_data_path, 'w') as f:
        f.write(updated_content)
    
    print(f"\n✓ Updated {actors_data_path}")
    return True

def save_model_dates_json(model_dates):
    """Save model dates to a JSON file for reference"""
    output_path = Path(__file__).parent.parent / "data" / "model_dates.json"
    
    with open(output_path, 'w') as f:
        json.dump(model_dates, f, indent=2)
    
    print(f"✓ Saved model dates to {output_path}")

def main():
    print("Fetching safetensors model creation dates from S3...\n")
    
    model_dates = fetch_model_dates()
    
    if not model_dates:
        print("No model dates found. Exiting.")
        return
    
    # Save to JSON file
    save_model_dates_json(model_dates)
    
    # Update actorsData.ts
    print("\nUpdating actorsData.ts...")
    update_actors_data(model_dates)
    
    print("\n✅ Done!")

if __name__ == "__main__":
    main()
