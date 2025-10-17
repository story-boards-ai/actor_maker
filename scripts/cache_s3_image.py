#!/usr/bin/env python3
"""
Download S3 images for caching (supports batch downloads)
Uses existing boto3 setup from the project
"""

import sys
import json
import os
from urllib.parse import urlparse
import boto3
from botocore.exceptions import ClientError
from concurrent.futures import ThreadPoolExecutor, as_completed

def parse_s3_url(s3_url):
    """Parse S3 URL to extract bucket and key"""
    parsed = urlparse(s3_url)
    
    # Handle different S3 URL formats
    if '.s3.' in parsed.hostname or '.s3-' in parsed.hostname:
        # Format: bucket-name.s3.region.amazonaws.com/key
        bucket = parsed.hostname.split('.')[0]
        key = parsed.path.lstrip('/')
        return bucket, key
    elif parsed.hostname.startswith('s3.') or parsed.hostname.startswith('s3-'):
        # Format: s3.region.amazonaws.com/bucket-name/key
        parts = parsed.path.lstrip('/').split('/', 1)
        bucket = parts[0]
        key = parts[1] if len(parts) > 1 else ''
        return bucket, key
    
    return None, None

def download_s3_image(s3_url, output_path, s3_client=None):
    """Download single image from S3 using boto3"""
    try:
        bucket, key = parse_s3_url(s3_url)
        
        if not bucket or not key:
            return {
                'success': False,
                'error': f'Could not parse S3 URL: {s3_url}',
                's3_url': s3_url
            }
        
        # Use provided client or create new one
        if s3_client is None:
            s3_client = boto3.client('s3')
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Download file
        response = s3_client.get_object(Bucket=bucket, Key=key)
        
        # Write to file
        with open(output_path, 'wb') as f:
            f.write(response['Body'].read())
        
        # Get file size
        size = os.path.getsize(output_path)
        
        return {
            'success': True,
            'size_bytes': size,
            'etag': response.get('ETag', '').strip('"'),
            'bucket': bucket,
            'key': key,
            's3_url': s3_url
        }
        
    except ClientError as e:
        return {
            'success': False,
            'error': f'AWS Error: {e.response["Error"]["Code"]} - {e.response["Error"]["Message"]}',
            's3_url': s3_url
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            's3_url': s3_url
        }

def download_batch(downloads):
    """Download multiple images in parallel"""
    # Initialize S3 client once for all downloads
    s3_client = boto3.client('s3')
    
    results = []
    
    # Use ThreadPoolExecutor for parallel downloads (S3 is I/O bound)
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {
            executor.submit(download_s3_image, item['s3_url'], item['output_path'], s3_client): item
            for item in downloads
        }
        
        for future in as_completed(futures):
            result = future.result()
            results.append(result)
    
    return results

if __name__ == '__main__':
    # Support both single download and batch download
    if len(sys.argv) == 2:
        # Batch mode: read JSON from stdin
        try:
            batch_data = json.loads(sys.argv[1])
            results = download_batch(batch_data['downloads'])
            print(json.dumps({'success': True, 'results': results}))
            sys.exit(0)
        except Exception as e:
            print(json.dumps({
                'success': False,
                'error': f'Batch download failed: {str(e)}'
            }))
            sys.exit(1)
    elif len(sys.argv) == 3:
        # Single download mode (backwards compatible)
        s3_url = sys.argv[1]
        output_path = sys.argv[2]
        
        result = download_s3_image(s3_url, output_path)
        print(json.dumps(result))
        
        sys.exit(0 if result['success'] else 1)
    else:
        print(json.dumps({
            'success': False,
            'error': 'Usage: cache_s3_image.py <json_batch> OR cache_s3_image.py <s3_url> <output_path>'
        }))
        sys.exit(1)
