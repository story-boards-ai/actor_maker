#!/usr/bin/env python3
"""
Sync Training Data to Manifests Script

This script:
1. Scans all actor training_data folders for images
2. Deletes legacy response.json files
3. Updates actor manifests with complete training data information
4. Compares local files with S3 URLs (from old response.json if exists)
5. Calculates MD5 hashes for sync status tracking
"""

import json
import os
import hashlib
import glob
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

# Project root
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
ACTORS_DIR = DATA_DIR / "actors"
MANIFESTS_DIR = DATA_DIR / "actor_manifests"

def calculate_md5(file_path: Path) -> str:
    """Calculate MD5 hash of a file"""
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

def get_s3_urls_from_response(actor_dir: Path) -> Dict[str, str]:
    """Extract S3 URLs from response.json before deleting it"""
    response_file = actor_dir / "training_data" / "response.json"
    s3_urls = {}
    
    if response_file.exists():
        try:
            with open(response_file, 'r') as f:
                data = json.load(f)
                urls = data.get('output', {}).get('output', {}).get('s3_image_urls', [])
                for url in urls:
                    filename = url.split('/')[-1]
                    s3_urls[filename] = url
        except Exception as e:
            print(f"  ⚠️  Warning: Could not read response.json: {e}")
    
    return s3_urls

def scan_training_data_folder(actor_dir: Path, actor_name: str) -> List[Dict]:
    """Scan training_data folder and return list of training images with metadata"""
    training_data_dir = actor_dir / "training_data"
    
    if not training_data_dir.exists():
        return []
    
    # Get S3 URLs before we delete response.json
    s3_urls = get_s3_urls_from_response(actor_dir)
    
    training_images = []
    image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.bmp']
    
    # Find all image files
    for ext in image_extensions:
        for img_path in training_data_dir.glob(f'*{ext}'):
            # Skip if it's not a training image (exclude base images, posters, etc.)
            filename = img_path.name
            
            # Get file stats
            stats = img_path.stat()
            file_size = stats.st_size
            modified_time = stats.st_mtime
            
            # Calculate MD5 hash
            md5_hash = calculate_md5(img_path)
            
            # Check if we have S3 URL for this file
            s3_url = s3_urls.get(filename)
            
            # Determine sync status
            if s3_url:
                status = "synced"  # Assume synced if we have S3 URL
            else:
                status = "local_only"
            
            training_image = {
                "filename": filename,
                "local_path": f"data/actors/{actor_name}/training_data/{filename}",
                "size_bytes": file_size,
                "size_mb": round(file_size / (1024 * 1024), 2),
                "modified_timestamp": modified_time,
                "modified_date": datetime.fromtimestamp(modified_time).isoformat(),
                "md5_hash": md5_hash,
                "s3_url": s3_url,
                "status": status
            }
            
            training_images.append(training_image)
    
    # Sort by filename
    training_images.sort(key=lambda x: x['filename'])
    
    return training_images

def delete_response_json(actor_dir: Path) -> bool:
    """Delete response.json file if it exists"""
    response_file = actor_dir / "training_data" / "response.json"
    
    if response_file.exists():
        try:
            response_file.unlink()
            return True
        except Exception as e:
            print(f"  ⚠️  Warning: Could not delete response.json: {e}")
            return False
    
    return False

def update_manifest(actor_id: str, actor_name: str, training_images: List[Dict]) -> bool:
    """Update actor manifest with training data information"""
    manifest_file = MANIFESTS_DIR / f"{actor_id}_manifest.json"
    
    if not manifest_file.exists():
        print(f"  ⚠️  Manifest not found: {manifest_file}")
        return False
    
    try:
        # Read existing manifest
        with open(manifest_file, 'r') as f:
            manifest = json.load(f)
        
        # Add training data section
        manifest['training_data'] = training_images
        manifest['training_data_updated'] = datetime.now().isoformat()
        
        # Update statistics
        total_training_size = sum(img['size_bytes'] for img in training_images)
        manifest['statistics']['training_images_count'] = len(training_images)
        manifest['statistics']['training_data_size_bytes'] = total_training_size
        manifest['statistics']['training_data_size_mb'] = round(total_training_size / (1024 * 1024), 2)
        
        # Count sync status
        synced_count = sum(1 for img in training_images if img['status'] == 'synced')
        local_only_count = sum(1 for img in training_images if img['status'] == 'local_only')
        
        manifest['statistics']['training_synced_count'] = synced_count
        manifest['statistics']['training_local_only_count'] = local_only_count
        
        # Write updated manifest
        with open(manifest_file, 'w') as f:
            json.dump(manifest, f, indent=2)
        
        return True
    
    except Exception as e:
        print(f"  ❌ Error updating manifest: {e}")
        return False

def process_actor(actor_dir: Path) -> Dict:
    """Process a single actor directory"""
    actor_name = actor_dir.name
    
    # Extract actor ID from name (e.g., "0000_european_16_male" -> "0000")
    actor_id = actor_name.split('_')[0]
    
    print(f"\n📁 Processing actor: {actor_name} (ID: {actor_id})")
    
    result = {
        'actor_id': actor_id,
        'actor_name': actor_name,
        'training_images_found': 0,
        'response_json_deleted': False,
        'manifest_updated': False
    }
    
    # Scan training data folder
    training_images = scan_training_data_folder(actor_dir, actor_name)
    result['training_images_found'] = len(training_images)
    
    if training_images:
        print(f"  ✅ Found {len(training_images)} training images")
        
        # Show sync status
        synced = sum(1 for img in training_images if img['status'] == 'synced')
        local_only = sum(1 for img in training_images if img['status'] == 'local_only')
        
        if synced > 0:
            print(f"     📤 {synced} images have S3 URLs (synced)")
        if local_only > 0:
            print(f"     💾 {local_only} images are local only")
    else:
        print(f"  ℹ️  No training images found")
    
    # Delete response.json
    deleted = delete_response_json(actor_dir)
    result['response_json_deleted'] = deleted
    if deleted:
        print(f"  🗑️  Deleted response.json")
    
    # Update manifest
    updated = update_manifest(actor_id, actor_name, training_images)
    result['manifest_updated'] = updated
    if updated:
        print(f"  ✅ Updated manifest")
    
    return result

def main():
    """Main execution function"""
    print("=" * 80)
    print("🔄 TRAINING DATA SYNC TO MANIFESTS")
    print("=" * 80)
    print(f"\nProject Root: {PROJECT_ROOT}")
    print(f"Actors Directory: {ACTORS_DIR}")
    print(f"Manifests Directory: {MANIFESTS_DIR}")
    
    if not ACTORS_DIR.exists():
        print(f"\n❌ Error: Actors directory not found: {ACTORS_DIR}")
        return
    
    if not MANIFESTS_DIR.exists():
        print(f"\n❌ Error: Manifests directory not found: {MANIFESTS_DIR}")
        return
    
    # Get all actor directories
    actor_dirs = [d for d in ACTORS_DIR.iterdir() if d.is_dir()]
    
    print(f"\n📊 Found {len(actor_dirs)} actor directories")
    
    # Process each actor
    results = []
    for actor_dir in sorted(actor_dirs):
        result = process_actor(actor_dir)
        results.append(result)
    
    # Summary
    print("\n" + "=" * 80)
    print("📊 SUMMARY")
    print("=" * 80)
    
    total_actors = len(results)
    total_images = sum(r['training_images_found'] for r in results)
    total_deleted = sum(1 for r in results if r['response_json_deleted'])
    total_updated = sum(1 for r in results if r['manifest_updated'])
    
    print(f"\n✅ Processed {total_actors} actors")
    print(f"📸 Found {total_images} total training images")
    print(f"🗑️  Deleted {total_deleted} response.json files")
    print(f"📝 Updated {total_updated} manifests")
    
    # Show actors with training data
    actors_with_training = [r for r in results if r['training_images_found'] > 0]
    if actors_with_training:
        print(f"\n📋 Actors with training data ({len(actors_with_training)}):")
        for r in actors_with_training:
            print(f"   • {r['actor_name']}: {r['training_images_found']} images")
    
    print("\n✅ Sync complete!\n")

if __name__ == "__main__":
    main()
