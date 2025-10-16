#!/usr/bin/env python3
"""
Sync all actor training data from S3 to local storage in parallel.
Fast bulk download with concurrent workers.
"""
import sys
import json
import os
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse
import time

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv(project_root / '.env')

from src.utils.s3 import S3Client

def parse_s3_url(url: str) -> tuple[str, str]:
    """Parse S3 URL to extract bucket and key."""
    parsed = urlparse(url)
    hostname_parts = parsed.hostname.split('.')
    bucket = hostname_parts[0]
    key = parsed.path.lstrip('/')
    return bucket, key

def download_single_image(s3_client: S3Client, url: str, local_path: Path) -> dict:
    """Download a single image from S3."""
    try:
        # Skip if already exists
        if local_path.exists():
            return {
                'success': True,
                'skipped': True,
                'url': url,
                'path': str(local_path)
            }
        
        # Parse S3 URL
        bucket, key = parse_s3_url(url)
        
        # Download from S3
        file_data = s3_client.download_file(bucket, key)
        
        # Save locally
        local_path.parent.mkdir(parents=True, exist_ok=True)
        with open(local_path, 'wb') as f:
            f.write(file_data)
        
        return {
            'success': True,
            'skipped': False,
            'url': url,
            'path': str(local_path),
            'size': len(file_data)
        }
    except Exception as e:
        return {
            'success': False,
            'skipped': False,
            'url': url,
            'path': str(local_path),
            'error': str(e)
        }

def sync_actor_training_data(actor: dict, s3_client: S3Client, max_workers: int = 10) -> dict:
    """Sync training data for a single actor with parallel downloads."""
    actor_name = actor['name']
    
    # Load training data response.json
    response_file = project_root / 'data' / 'actors' / actor_name / 'training_data' / 'response.json'
    
    if not response_file.exists():
        return {
            'actor': actor_name,
            'success': False,
            'error': 'response.json not found',
            'downloaded': 0,
            'skipped': 0,
            'failed': 0
        }
    
    try:
        with open(response_file, 'r') as f:
            response_data = json.load(f)
        
        s3_urls = response_data.get('output', {}).get('output', {}).get('s3_image_urls', [])
        
        if not s3_urls:
            return {
                'actor': actor_name,
                'success': True,
                'error': 'No S3 URLs found',
                'downloaded': 0,
                'skipped': 0,
                'failed': 0
            }
        
        # Prepare download tasks
        local_dir = project_root / 'data' / 'actors' / actor_name / 'training_data'
        local_dir.mkdir(parents=True, exist_ok=True)
        
        download_tasks = []
        for url in s3_urls:
            filename = url.split('/')[-1]
            local_path = local_dir / filename
            download_tasks.append((url, local_path))
        
        # Download in parallel
        downloaded = 0
        skipped = 0
        failed = 0
        errors = []
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(download_single_image, s3_client, url, path): (url, path)
                for url, path in download_tasks
            }
            
            for future in as_completed(futures):
                result = future.result()
                if result['success']:
                    if result['skipped']:
                        skipped += 1
                    else:
                        downloaded += 1
                else:
                    failed += 1
                    errors.append(result.get('error', 'Unknown error'))
        
        return {
            'actor': actor_name,
            'success': True,
            'downloaded': downloaded,
            'skipped': skipped,
            'failed': failed,
            'total': len(s3_urls),
            'errors': errors
        }
        
    except Exception as e:
        return {
            'actor': actor_name,
            'success': False,
            'error': str(e),
            'downloaded': 0,
            'skipped': 0,
            'failed': 0
        }

def sync_all_actors(max_workers_per_actor: int = 10, max_concurrent_actors: int = 5) -> dict:
    """
    Sync all actors' training data in parallel.
    
    Args:
        max_workers_per_actor: Number of parallel downloads per actor
        max_concurrent_actors: Number of actors to process simultaneously
    """
    # Load actors data
    actors_data_file = project_root / 'data' / 'actorsData.json'
    
    if not actors_data_file.exists():
        print("❌ actorsData.json not found", file=sys.stderr)
        return {'error': 'actorsData.json not found'}
    
    with open(actors_data_file, 'r') as f:
        actors = json.load(f)
    
    print(f"🚀 Starting sync for {len(actors)} actors", file=sys.stderr)
    print(f"⚙️  Settings: {max_workers_per_actor} downloads/actor, {max_concurrent_actors} concurrent actors", file=sys.stderr)
    print("", file=sys.stderr)
    
    # Initialize S3 client (shared across threads)
    s3_client = S3Client()
    
    start_time = time.time()
    results = []
    total_downloaded = 0
    total_skipped = 0
    total_failed = 0
    
    # Process actors in parallel
    with ThreadPoolExecutor(max_workers=max_concurrent_actors) as executor:
        futures = {
            executor.submit(sync_actor_training_data, actor, s3_client, max_workers_per_actor): actor
            for actor in actors
        }
        
        completed = 0
        for future in as_completed(futures):
            result = future.result()
            results.append(result)
            completed += 1
            
            if result['success']:
                total_downloaded += result['downloaded']
                total_skipped += result['skipped']
                total_failed += result['failed']
                
                status = f"✅ {result['actor']}: {result['downloaded']} downloaded, {result['skipped']} skipped"
                if result['failed'] > 0:
                    status += f", {result['failed']} failed"
            else:
                status = f"❌ {result['actor']}: {result.get('error', 'Unknown error')}"
            
            print(f"[{completed}/{len(actors)}] {status}", file=sys.stderr)
    
    elapsed_time = time.time() - start_time
    
    summary = {
        'total_actors': len(actors),
        'total_downloaded': total_downloaded,
        'total_skipped': total_skipped,
        'total_failed': total_failed,
        'elapsed_seconds': round(elapsed_time, 2),
        'results': results
    }
    
    print("", file=sys.stderr)
    print("=" * 60, file=sys.stderr)
    print(f"✅ Sync Complete!", file=sys.stderr)
    print(f"📊 Total: {total_downloaded} downloaded, {total_skipped} skipped, {total_failed} failed", file=sys.stderr)
    print(f"⏱️  Time: {elapsed_time:.2f} seconds", file=sys.stderr)
    print(f"🚀 Speed: {(total_downloaded / elapsed_time):.1f} images/sec" if elapsed_time > 0 else "", file=sys.stderr)
    print("=" * 60, file=sys.stderr)
    
    return summary

def main():
    # Parse command line arguments
    max_workers_per_actor = 10  # Parallel downloads per actor
    max_concurrent_actors = 5   # Actors processed simultaneously
    
    if len(sys.argv) > 1:
        max_workers_per_actor = int(sys.argv[1])
    if len(sys.argv) > 2:
        max_concurrent_actors = int(sys.argv[2])
    
    try:
        result = sync_all_actors(max_workers_per_actor, max_concurrent_actors)
        
        # Output JSON result to stdout
        print(json.dumps(result, indent=2))
        
        if result.get('total_failed', 0) > 0:
            sys.exit(1)
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'total_downloaded': 0,
            'total_skipped': 0,
            'total_failed': 0
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == '__main__':
    main()
