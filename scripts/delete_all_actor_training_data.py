#!/usr/bin/env python3
"""
Delete all training data for an actor from both local storage and S3.
Uses manifest as source of truth for S3 URLs.
"""

import sys
import json
import os
import boto3
from pathlib import Path
from datetime import datetime

def delete_all_training_data(actor_name):
    """Delete all training data from local and S3, update manifest"""
    
    # Get project root (parent of scripts directory)
    project_root = Path(__file__).parent.parent
    
    # Extract actor ID from actor_name (e.g., "0285_south_american_13_male" -> "0285")
    actor_id = actor_name.split('_')[0]
    
    # Paths
    training_data_dir = project_root / 'data' / 'actors' / actor_name / 'training_data'
    response_json_path = training_data_dir / 'response.json'
    manifest_path = project_root / 'data' / 'actor_manifests' / f'{actor_id.zfill(4)}_manifest.json'
    
    deleted_local = 0
    deleted_s3 = 0
    errors = []
    
    # Load S3 URLs from manifest (primary source)
    s3_urls = []
    manifest_data = None
    
    if manifest_path.exists():
        try:
            with open(manifest_path, 'r') as f:
                manifest_data = json.load(f)
                training_data = manifest_data.get('training_data', [])
                s3_urls = [img.get('s3_url') for img in training_data if img.get('s3_url')]
        except Exception as e:
            errors.append(f"Failed to load manifest: {str(e)}")
    
    # Fallback: Load S3 URLs from response.json (legacy)
    if not s3_urls and response_json_path.exists():
        try:
            with open(response_json_path, 'r') as f:
                response_data = json.load(f)
                s3_urls = response_data.get('output', {}).get('output', {}).get('s3_image_urls', [])
        except Exception as e:
            errors.append(f"Failed to load response.json: {str(e)}")
    
    # Delete from S3
    if s3_urls:
        try:
            s3_client = boto3.client('s3')
            bucket_name = 'story-boards-assets'
            
            for s3_url in s3_urls:
                try:
                    # Extract key from URL
                    key = s3_url.replace(f'https://{bucket_name}.s3-accelerate.amazonaws.com/', '')
                    key = key.replace(f'https://{bucket_name}.s3.us-west-1.amazonaws.com/', '')
                    
                    # Delete from S3
                    s3_client.delete_object(Bucket=bucket_name, Key=key)
                    deleted_s3 += 1
                except Exception as e:
                    errors.append(f"Failed to delete from S3 {s3_url}: {str(e)}")
        except Exception as e:
            errors.append(f"Failed to initialize S3 client: {str(e)}")
    
    # Delete local files
    if training_data_dir.exists():
        try:
            for file_path in training_data_dir.glob('*'):
                if file_path.is_file() and file_path.suffix.lower() in ['.png', '.jpg', '.jpeg']:
                    try:
                        file_path.unlink()
                        deleted_local += 1
                    except Exception as e:
                        errors.append(f"Failed to delete local file {file_path.name}: {str(e)}")
        except Exception as e:
            errors.append(f"Failed to scan local directory: {str(e)}")
    
    # Delete response.json (legacy)
    if response_json_path.exists():
        try:
            response_json_path.unlink()
        except Exception as e:
            errors.append(f"Failed to delete response.json: {str(e)}")
    
    # Delete prompt_metadata.json
    prompt_metadata_path = training_data_dir / 'prompt_metadata.json'
    if prompt_metadata_path.exists():
        try:
            prompt_metadata_path.unlink()
        except Exception as e:
            errors.append(f"Failed to delete prompt_metadata.json: {str(e)}")
    
    # Update manifest - clear training_data array but keep the manifest
    if manifest_path.exists() and manifest_data:
        try:
            # Clear training data
            manifest_data['training_data'] = []
            
            # Update statistics
            if 'statistics' not in manifest_data:
                manifest_data['statistics'] = {}
            
            manifest_data['statistics']['training_images_count'] = 0
            manifest_data['statistics']['training_synced_count'] = 0
            manifest_data['training_data_updated'] = datetime.now().isoformat()
            
            # Save updated manifest
            with open(manifest_path, 'w') as f:
                json.dump(manifest_data, f, indent=2)
                
        except Exception as e:
            errors.append(f"Failed to update manifest: {str(e)}")
    
    # Return result
    result = {
        'deleted': deleted_s3,  # Total deleted from S3 (what matters)
        'deleted_local': deleted_local,
        'deleted_s3': deleted_s3,
        'manifest_updated': manifest_path.exists() and manifest_data is not None,
        'errors': errors,
        'success': len(errors) == 0
    }
    
    print(json.dumps(result))
    return 0 if result['success'] else 1

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Missing actor_name argument'}))
        sys.exit(1)
    
    actor_name = sys.argv[1]
    sys.exit(delete_all_training_data(actor_name))
