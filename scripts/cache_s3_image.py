#!/usr/bin/env python3
"""
Download S3 image for caching
Uses existing boto3 setup from the project
"""

import sys
import json
import os
from urllib.parse import urlparse
import boto3
from botocore.exceptions import ClientError

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

def download_s3_image(s3_url, output_path):
    """Download image from S3 using boto3"""
    try:
        bucket, key = parse_s3_url(s3_url)
        
        if not bucket or not key:
            return {
                'success': False,
                'error': f'Could not parse S3 URL: {s3_url}'
            }
        
        # Initialize S3 client (uses AWS credentials from environment)
        s3 = boto3.client('s3')
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Download file
        response = s3.get_object(Bucket=bucket, Key=key)
        
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
            'key': key
        }
        
    except ClientError as e:
        return {
            'success': False,
            'error': f'AWS Error: {e.response["Error"]["Code"]} - {e.response["Error"]["Message"]}'
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(json.dumps({
            'success': False,
            'error': 'Usage: cache_s3_image.py <s3_url> <output_path>'
        }))
        sys.exit(1)
    
    s3_url = sys.argv[1]
    output_path = sys.argv[2]
    
    result = download_s3_image(s3_url, output_path)
    print(json.dumps(result))
    
    sys.exit(0 if result['success'] else 1)
