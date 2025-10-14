#!/usr/bin/env python3
"""
Clean up training_versions.json files by:
1. Removing duplicate entries (same version number)
2. Consolidating entries - prefer ones with parameters over S3-synced ones
3. Standardizing version names (V1, V2, etc. instead of full filenames)
4. Removing orphaned S3-synced entries that have corresponding training entries
"""

import json
import os
import re
from pathlib import Path
from typing import Dict, List, Any
from collections import defaultdict

def extract_version_number(name: str) -> str | None:
    """Extract version number from various name formats"""
    if not name:
        return None
    
    # Match V1, V2, etc.
    if re.match(r'^V\d+$', name, re.IGNORECASE):
        return name.upper()
    
    # Match style_1_vV8.safetensors -> V8
    match = re.search(r'_v(V?\d+)\.safetensors$', name, re.IGNORECASE)
    if match:
        version = match.group(1).upper()
        # Normalize VV8 -> V8
        return re.sub(r'^VV', 'V', version)
    
    # Match style_1_vV8 -> V8
    match = re.search(r'_v(V?\d+)$', name, re.IGNORECASE)
    if match:
        version = match.group(1).upper()
        return re.sub(r'^VV', 'V', version)
    
    return None

def consolidate_versions(versions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Consolidate duplicate versions, preferring entries with parameters"""
    
    # Group versions by version number
    version_groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    orphaned = []  # Versions without a clear version number
    
    for version in versions:
        version_num = extract_version_number(version.get('name', ''))
        if version_num:
            version_groups[version_num].append(version)
        else:
            orphaned.append(version)
    
    consolidated = []
    
    # Process each version group
    for version_num, group in sorted(version_groups.items()):
        if len(group) == 1:
            # Single entry, just standardize the name
            entry = group[0]
            entry['name'] = version_num
            consolidated.append(entry)
        else:
            # Multiple entries - consolidate
            print(f"  Found {len(group)} entries for {version_num}, consolidating...")
            
            # Prioritize entries with parameters over S3-synced entries
            entries_with_params = [e for e in group if e.get('parameters') and len(e.get('parameters', {})) > 0]
            entries_without_params = [e for e in group if not e.get('parameters') or len(e.get('parameters', {})) == 0]
            
            # Choose the best entry
            if entries_with_params:
                # Prefer completed entries with parameters
                completed = [e for e in entries_with_params if e.get('status') == 'completed']
                if completed:
                    best = completed[0]
                else:
                    best = entries_with_params[0]
            else:
                # No entries with parameters, use the first one
                best = group[0]
            
            # Merge data from other entries
            for other in group:
                if other is best:
                    continue
                
                # If best doesn't have loraUrl but other does, take it
                if not best.get('loraUrl') and other.get('loraUrl'):
                    best['loraUrl'] = other['loraUrl']
                    print(f"    Added loraUrl from duplicate entry")
                
                # If best doesn't have completedAt but other does, take it
                if not best.get('completedAt') and other.get('completedAt'):
                    best['completedAt'] = other['completedAt']
                
                # Update status to completed if we have a loraUrl
                if best.get('loraUrl') and best.get('status') != 'completed':
                    best['status'] = 'completed'
                    print(f"    Updated status to completed")
            
            # Standardize name
            best['name'] = version_num
            
            # Add lastSynced if we consolidated
            from datetime import datetime
            best['lastSynced'] = datetime.utcnow().isoformat() + 'Z'
            
            consolidated.append(best)
            print(f"    Consolidated into single entry: {best['id']}")
    
    # Add orphaned entries (couldn't extract version number)
    if orphaned:
        print(f"  Found {len(orphaned)} orphaned entries (no clear version number)")
        consolidated.extend(orphaned)
    
    # Sort by version number (V1, V2, V3, etc.)
    def version_sort_key(v):
        version_num = extract_version_number(v.get('name', ''))
        if version_num:
            # Extract number from V8 -> 8
            match = re.search(r'V(\d+)', version_num)
            if match:
                return (0, int(match.group(1)))  # (priority, number)
        return (1, 0)  # Orphaned entries go last
    
    consolidated.sort(key=version_sort_key, reverse=True)  # Newest first
    
    return consolidated

def cleanup_training_versions_file(file_path: Path) -> bool:
    """Clean up a single training_versions.json file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        versions = data.get('versions', [])
        if not versions:
            print(f"  No versions to clean up")
            return False
        
        original_count = len(versions)
        print(f"  Original: {original_count} versions")
        
        # Consolidate versions
        cleaned_versions = consolidate_versions(versions)
        
        new_count = len(cleaned_versions)
        print(f"  Cleaned: {new_count} versions")
        
        if original_count != new_count:
            print(f"  ✓ Removed {original_count - new_count} duplicate(s)")
        
        # Update data
        data['versions'] = cleaned_versions
        
        # Create backup
        backup_path = file_path.with_suffix('.json.backup')
        if not backup_path.exists():
            with open(backup_path, 'w', encoding='utf-8') as f:
                json.dump({'versions': versions}, f, indent=2)
            print(f"  Created backup: {backup_path.name}")
        
        # Write cleaned data
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        
        return original_count != new_count
        
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False

def main():
    """Clean up all training_versions.json files"""
    project_root = Path(__file__).parent.parent
    style_images_dir = project_root / 'resources' / 'style_images'
    
    if not style_images_dir.exists():
        print(f"Error: Style images directory not found: {style_images_dir}")
        return
    
    print("🧹 Cleaning up training_versions.json files...\n")
    
    # Find all training_versions.json files
    version_files = list(style_images_dir.glob('*/training_versions.json'))
    
    if not version_files:
        print("No training_versions.json files found")
        return
    
    print(f"Found {len(version_files)} training version files\n")
    
    cleaned_count = 0
    for file_path in sorted(version_files):
        style_name = file_path.parent.name
        print(f"📁 {style_name}")
        
        if cleanup_training_versions_file(file_path):
            cleaned_count += 1
        
        print()
    
    print(f"✅ Cleanup complete!")
    print(f"   Files processed: {len(version_files)}")
    print(f"   Files modified: {cleaned_count}")
    print(f"   Files unchanged: {len(version_files) - cleaned_count}")

if __name__ == '__main__':
    main()
