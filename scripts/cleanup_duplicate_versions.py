#!/usr/bin/env python3
"""
Cleanup script to remove duplicate training versions from training_versions.json files.

This script:
1. Scans all style folders for training_versions.json files
2. Identifies duplicates (same loraUrl with different IDs)
3. Keeps the detailed entry (with parameters), removes minimal entry
4. Creates backup before modifying files
"""

import json
import os
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any


def find_training_version_files(base_dir: str) -> List[Path]:
    """Find all training_versions.json files in style folders."""
    style_images_dir = Path(base_dir) / 'resources' / 'style_images'
    
    if not style_images_dir.exists():
        print(f"❌ Style images directory not found: {style_images_dir}")
        return []
    
    version_files = []
    for style_folder in style_images_dir.iterdir():
        if style_folder.is_dir():
            version_file = style_folder / 'training_versions.json'
            if version_file.exists():
                version_files.append(version_file)
    
    return version_files


def extract_filename_from_url(url: str) -> str:
    """Extract filename from S3 URL."""
    if not url:
        return ''
    return url.split('/')[-1]


def has_detailed_parameters(version: Dict[str, Any]) -> bool:
    """Check if version has detailed training parameters."""
    params = version.get('parameters', {})
    return bool(params and len(params) > 0)


def cleanup_duplicates(version_file: Path, dry_run: bool = True) -> Dict[str, Any]:
    """
    Clean up duplicate versions in a training_versions.json file.
    
    Returns statistics about the cleanup.
    """
    print(f"\n{'[DRY RUN] ' if dry_run else ''}Processing: {version_file}")
    
    # Load the file
    with open(version_file, 'r') as f:
        data = json.load(f)
    
    versions = data.get('versions', [])
    if not versions:
        print("  ℹ️  No versions found")
        return {'file': str(version_file), 'duplicates_found': 0, 'duplicates_removed': 0}
    
    print(f"  📊 Total versions: {len(versions)}")
    
    # Group versions by loraUrl
    url_groups: Dict[str, List[Dict[str, Any]]] = {}
    for version in versions:
        lora_url = version.get('loraUrl', '')
        if lora_url:
            filename = extract_filename_from_url(lora_url)
            if filename not in url_groups:
                url_groups[filename] = []
            url_groups[filename].append(version)
    
    # Find duplicates
    duplicates_found = 0
    versions_to_keep = []
    versions_to_remove = []
    
    for filename, group in url_groups.items():
        if len(group) > 1:
            duplicates_found += len(group) - 1
            print(f"  🔍 Found {len(group)} versions for: {filename}")
            
            # Sort by priority: detailed parameters > has completedAt > newest timestamp
            def version_priority(v: Dict[str, Any]) -> tuple:
                has_params = has_detailed_parameters(v)
                has_completed = bool(v.get('completedAt'))
                timestamp = v.get('timestamp', '')
                return (has_params, has_completed, timestamp)
            
            sorted_group = sorted(group, key=version_priority, reverse=True)
            
            # Keep the best one
            best = sorted_group[0]
            versions_to_keep.append(best)
            
            print(f"    ✅ Keeping: ID={best.get('id')}, "
                  f"params={'yes' if has_detailed_parameters(best) else 'no'}, "
                  f"name={best.get('name')}")
            
            # Remove the rest
            for duplicate in sorted_group[1:]:
                versions_to_remove.append(duplicate)
                print(f"    ❌ Removing: ID={duplicate.get('id')}, "
                      f"params={'yes' if has_detailed_parameters(duplicate) else 'no'}, "
                      f"name={duplicate.get('name')}")
        else:
            # No duplicates, keep as is
            versions_to_keep.append(group[0])
    
    # Add versions without loraUrl (pending/failed)
    for version in versions:
        if not version.get('loraUrl'):
            versions_to_keep.append(version)
    
    duplicates_removed = len(versions_to_remove)
    
    if duplicates_removed > 0:
        print(f"  📝 Summary: {duplicates_removed} duplicate(s) will be removed")
        
        if not dry_run:
            # Create backup
            backup_path = version_file.with_suffix('.json.backup')
            shutil.copy2(version_file, backup_path)
            print(f"  💾 Backup created: {backup_path}")
            
            # Write cleaned data
            data['versions'] = versions_to_keep
            with open(version_file, 'w') as f:
                json.dump(data, f, indent=2)
            print(f"  ✅ File updated: {len(versions_to_keep)} versions remaining")
    else:
        print("  ✨ No duplicates found")
    
    return {
        'file': str(version_file),
        'total_versions': len(versions),
        'duplicates_found': duplicates_found,
        'duplicates_removed': duplicates_removed,
        'versions_remaining': len(versions_to_keep)
    }


def main():
    """Main cleanup function."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Clean up duplicate training versions from training_versions.json files'
    )
    parser.add_argument(
        '--apply',
        action='store_true',
        help='Actually apply changes (default is dry-run)'
    )
    parser.add_argument(
        '--base-dir',
        type=str,
        default='.',
        help='Base directory of the actor_maker project (default: current directory)'
    )
    
    args = parser.parse_args()
    
    dry_run = not args.apply
    base_dir = args.base_dir
    
    print("=" * 80)
    print("Training Versions Cleanup Script")
    print("=" * 80)
    
    if dry_run:
        print("\n⚠️  DRY RUN MODE - No files will be modified")
        print("   Run with --apply to actually clean up duplicates\n")
    else:
        print("\n⚠️  LIVE MODE - Files will be modified!")
        print("   Backups will be created with .backup extension\n")
    
    # Find all training_versions.json files
    version_files = find_training_version_files(base_dir)
    
    if not version_files:
        print("❌ No training_versions.json files found")
        return
    
    print(f"📁 Found {len(version_files)} training_versions.json files\n")
    
    # Process each file
    results = []
    for version_file in version_files:
        result = cleanup_duplicates(version_file, dry_run=dry_run)
        results.append(result)
    
    # Print summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    total_duplicates_found = sum(r['duplicates_found'] for r in results)
    total_duplicates_removed = sum(r['duplicates_removed'] for r in results)
    files_with_duplicates = sum(1 for r in results if r['duplicates_found'] > 0)
    
    print(f"Files processed: {len(results)}")
    print(f"Files with duplicates: {files_with_duplicates}")
    print(f"Total duplicates found: {total_duplicates_found}")
    print(f"Total duplicates removed: {total_duplicates_removed}")
    
    if dry_run and total_duplicates_found > 0:
        print("\n💡 Run with --apply to actually remove duplicates")
    elif not dry_run and total_duplicates_removed > 0:
        print("\n✅ Cleanup complete! Backups saved with .backup extension")
    else:
        print("\n✨ No duplicates found - all clean!")


if __name__ == '__main__':
    main()
