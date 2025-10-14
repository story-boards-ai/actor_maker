#!/usr/bin/env python3
"""
Normalize filenames in style image directories.

This script:
- Converts all letters to lowercase
- Replaces spaces with underscores
- Removes special characters (except underscores, hyphens, and dots)
- Handles URL encoding (e.g., %20)
- Preserves file extensions
- Creates a backup log of all changes
"""

import os
import re
import urllib.parse
from pathlib import Path
from datetime import datetime


def normalize_filename(filename: str) -> str:
    """
    Normalize a filename according to the rules:
    - Lowercase
    - Spaces -> underscores
    - Remove special characters
    - Handle URL encoding
    
    Args:
        filename: Original filename including extension
        
    Returns:
        Normalized filename
    """
    # Split filename and extension
    name, ext = os.path.splitext(filename)
    
    # Decode URL encoding (e.g., %20 -> space)
    name = urllib.parse.unquote(name)
    
    # Convert to lowercase
    name = name.lower()
    
    # Replace spaces with underscores
    name = name.replace(' ', '_')
    
    # Remove special characters, keep only alphanumeric, underscores, and hyphens
    # This regex keeps: a-z, 0-9, _, -
    name = re.sub(r'[^a-z0-9_\-]', '', name)
    
    # Remove multiple consecutive underscores
    name = re.sub(r'_+', '_', name)
    
    # Remove leading/trailing underscores
    name = name.strip('_')
    
    # Lowercase the extension too
    ext = ext.lower()
    
    return f"{name}{ext}"


def process_style_directory(style_dir: Path, dry_run: bool = True) -> list:
    """
    Process all files in a style directory.
    
    Args:
        style_dir: Path to the style directory
        dry_run: If True, only show what would be changed without making changes
        
    Returns:
        List of tuples (old_path, new_path, status)
    """
    changes = []
    
    if not style_dir.exists():
        print(f"❌ Directory not found: {style_dir}")
        return changes
    
    # Get all files in the directory
    files = [f for f in style_dir.iterdir() if f.is_file()]
    
    for file_path in files:
        original_name = file_path.name
        normalized_name = normalize_filename(original_name)
        
        # Skip if no change needed
        if original_name == normalized_name:
            changes.append((file_path, file_path, 'unchanged'))
            continue
        
        new_path = file_path.parent / normalized_name
        
        # Check if target filename already exists
        if new_path.exists() and new_path != file_path:
            changes.append((file_path, new_path, 'conflict'))
            print(f"⚠️  CONFLICT: {original_name} -> {normalized_name} (target exists)")
            continue
        
        if dry_run:
            changes.append((file_path, new_path, 'would_rename'))
            print(f"📝 Would rename: {original_name} -> {normalized_name}")
        else:
            try:
                file_path.rename(new_path)
                changes.append((file_path, new_path, 'renamed'))
                print(f"✅ Renamed: {original_name} -> {normalized_name}")
            except Exception as e:
                changes.append((file_path, new_path, f'error: {str(e)}'))
                print(f"❌ Error renaming {original_name}: {e}")
    
    return changes


def main():
    """Main function to process all style directories."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Normalize filenames in style image directories'
    )
    parser.add_argument(
        '--execute',
        action='store_true',
        help='Actually rename files (default is dry-run mode)'
    )
    parser.add_argument(
        '--style',
        type=str,
        help='Process only a specific style directory (e.g., "16_dynamic_simplicity")'
    )
    
    args = parser.parse_args()
    
    # Get the base directory
    script_dir = Path(__file__).parent
    base_dir = script_dir.parent / 'resources' / 'style_images'
    
    if not base_dir.exists():
        print(f"❌ Style images directory not found: {base_dir}")
        return
    
    # Determine which directories to process
    if args.style:
        style_dirs = [base_dir / args.style]
        if not style_dirs[0].exists():
            print(f"❌ Style directory not found: {style_dirs[0]}")
            return
    else:
        style_dirs = [d for d in base_dir.iterdir() if d.is_dir()]
    
    # Show mode
    mode = "EXECUTE MODE" if args.execute else "DRY-RUN MODE"
    print(f"\n{'='*60}")
    print(f"🔧 FILENAME NORMALIZATION - {mode}")
    print(f"{'='*60}\n")
    
    if not args.execute:
        print("ℹ️  Running in dry-run mode. Use --execute to actually rename files.\n")
    
    # Process each style directory
    all_changes = []
    for style_dir in sorted(style_dirs):
        print(f"\n📁 Processing: {style_dir.name}")
        print(f"{'─'*60}")
        
        changes = process_style_directory(style_dir, dry_run=not args.execute)
        all_changes.extend(changes)
    
    # Summary
    print(f"\n{'='*60}")
    print("📊 SUMMARY")
    print(f"{'='*60}")
    
    total = len(all_changes)
    renamed = len([c for c in all_changes if c[2] in ['renamed', 'would_rename']])
    unchanged = len([c for c in all_changes if c[2] == 'unchanged'])
    conflicts = len([c for c in all_changes if c[2] == 'conflict'])
    errors = len([c for c in all_changes if c[2].startswith('error')])
    
    print(f"Total files processed: {total}")
    print(f"{'Would be renamed' if not args.execute else 'Renamed'}: {renamed}")
    print(f"Unchanged: {unchanged}")
    print(f"Conflicts: {conflicts}")
    print(f"Errors: {errors}")
    
    # Save log if changes were made
    if args.execute and renamed > 0:
        log_dir = script_dir.parent / 'logs'
        log_dir.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        log_file = log_dir / f'filename_normalization_{timestamp}.log'
        
        with open(log_file, 'w') as f:
            f.write(f"Filename Normalization Log - {datetime.now()}\n")
            f.write(f"{'='*80}\n\n")
            
            for old_path, new_path, status in all_changes:
                if status == 'renamed':
                    f.write(f"{old_path.name} -> {new_path.name}\n")
        
        print(f"\n📄 Log saved to: {log_file}")
    
    print()


if __name__ == '__main__':
    main()
