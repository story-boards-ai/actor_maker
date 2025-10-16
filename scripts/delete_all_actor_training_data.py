#!/usr/bin/env python3
"""
Delete all training data for an actor from both local storage and S3
"""

import sys
import json
import os
import boto3
from pathlib import Path

def delete_all_training_data(actor_name):
    """Delete all training data from local and S3"""
    
    # Get project root (parent of scripts directory)
    project_root = Path(__file__).parent.parent
    
    # Paths
    training_data_dir = project_root / 'data' / 'actors' / actor_name / 'training_data'
    response_json_path = training_data_dir / 'response.json'
    manifest_path = project_root / 'data' / 'actor_manifests' / f'{actor_name}_manifest.json'
    
    deleted_local = 0
    deleted_s3 = 0
    errors = []
    
    # Load S3 URLs from response.json
    s3_urls = []
    if response_json_path.exists():
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
    
    # Delete response.json
    if response_json_path.exists():
        try:
            response_json_path.unlink()
        except Exception as e:
            errors.append(f"Failed to delete response.json: {str(e)}")
    
    # Delete manifest file
    if manifest_path.exists():
        try:
            manifest_path.unlink()
        except Exception as e:
            errors.append(f"Failed to delete manifest: {str(e)}")
    
    # Return result
    result = {
        'deleted_local': deleted_local,
        'deleted_s3': deleted_s3,
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
