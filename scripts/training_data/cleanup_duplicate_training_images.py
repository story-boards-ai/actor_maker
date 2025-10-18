#!/usr/bin/env python3
"""
Cleanup script to remove duplicate training image entries from manifests.
This fixes the issue where parallel generation created duplicate entries with the same filename.
"""

import sys
import json
from pathlib import Path
from collections import defaultdict

project_root = Path(__file__).parent.parent.parent

def cleanup_manifest(manifest_path: Path) -> dict:
    """
    Remove duplicate training image entries from a manifest.
    Keeps the first occurrence of each unique filename.
    
    Returns:
        dict with cleanup statistics
    """
    with open(manifest_path, 'r') as f:
        manifest = json.load(f)
    
    training_data = manifest.get("training_data", [])
    if not training_data:
        return {"actor_id": manifest.get("character_id"), "duplicates_removed": 0}
    
    # Track seen filenames
    seen_filenames = set()
    unique_images = []
    duplicates_removed = 0
    
    for img in training_data:
        filename = img.get("filename", "")
        if filename not in seen_filenames:
            seen_filenames.add(filename)
            unique_images.append(img)
        else:
            duplicates_removed += 1
            print(f"  Removing duplicate: {filename}")
    
    if duplicates_removed > 0:
        # Update manifest
        manifest["training_data"] = unique_images
        
        # Update statistics
        if "statistics" in manifest:
            manifest["statistics"]["training_images_count"] = len(unique_images)
            manifest["statistics"]["training_synced_count"] = len([
                img for img in unique_images if img.get("status") == "synced"
            ])
        
        # Save updated manifest
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=2)
        
        print(f"  ✅ Cleaned manifest: {len(training_data)} → {len(unique_images)} images")
    
    return {
        "actor_id": manifest.get("character_id"),
        "original_count": len(training_data),
        "final_count": len(unique_images),
        "duplicates_removed": duplicates_removed
    }


def main():
    """Clean up all manifests."""
    manifests_dir = project_root / "data" / "actor_manifests"
    
    if not manifests_dir.exists():
        print(f"❌ Manifests directory not found: {manifests_dir}")
        sys.exit(1)
    
    manifest_files = sorted(manifests_dir.glob("*_manifest.json"))
    
    print(f"Found {len(manifest_files)} manifests to check")
    print("="*60)
    
    results = []
    total_duplicates = 0
    
    for manifest_path in manifest_files:
        actor_id = manifest_path.stem.replace("_manifest", "")
        print(f"\nChecking {actor_id}...")
        
        try:
            result = cleanup_manifest(manifest_path)
            results.append(result)
            total_duplicates += result["duplicates_removed"]
        except Exception as e:
            print(f"  ❌ Error: {e}")
    
    # Summary
    print("\n" + "="*60)
    print("CLEANUP SUMMARY")
    print("="*60)
    
    actors_with_duplicates = [r for r in results if r["duplicates_removed"] > 0]
    
    if actors_with_duplicates:
        print(f"\n✅ Cleaned {len(actors_with_duplicates)} actors:")
        for result in actors_with_duplicates:
            print(f"  {result['actor_id']}: removed {result['duplicates_removed']} duplicates")
        print(f"\nTotal duplicates removed: {total_duplicates}")
    else:
        print("\n✅ No duplicates found!")


if __name__ == "__main__":
    main()
