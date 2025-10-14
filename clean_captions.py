#!/usr/bin/env python3
"""
Clean caption files by removing the style token suffix.
Removes patterns like ", style SBai_style_82%" or ", SBai_style_82%" from the end of captions.
"""

import os
import re
from pathlib import Path

def clean_caption_file(file_path):
    """Remove style token from a single caption file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read().strip()
        
        original_content = content
        
        # Remove patterns like ", style SBai_style_XX%" or ", SBai_style_XX%" from the end
        # Also handles variations with or without quotes
        patterns = [
            r',\s*style\s+SBai_style_\d+%?\s*$',  # ", style SBai_style_82%"
            r',\s*SBai_style_\d+%?\s*$',           # ", SBai_style_82%"
            r'\s+style\s+SBai_style_\d+%?\s*$',    # " style SBai_style_82%"
            r'\s+SBai_style_\d+%?\s*$',            # " SBai_style_82%"
        ]
        
        for pattern in patterns:
            content = re.sub(pattern, '', content, flags=re.IGNORECASE)
        
        # Remove any trailing quotes if present
        content = content.strip('"').strip()
        
        # Only write if content changed
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, original_content, content
        
        return False, original_content, content
        
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False, None, None

def clean_style_directory(style_dir):
    """Clean all caption files in a style directory."""
    style_path = Path(style_dir)
    
    if not style_path.exists():
        print(f"Directory not found: {style_dir}")
        return
    
    txt_files = list(style_path.glob("*.txt"))
    
    if not txt_files:
        print(f"No .txt files found in {style_dir}")
        return
    
    print(f"\nProcessing {len(txt_files)} caption files in {style_path.name}...")
    
    changed_count = 0
    unchanged_count = 0
    
    for txt_file in txt_files:
        changed, original, cleaned = clean_caption_file(txt_file)
        
        if changed:
            changed_count += 1
            if changed_count <= 3:  # Show first 3 examples
                print(f"\n✓ {txt_file.name}")
                print(f"  Before: {original[:80]}...")
                print(f"  After:  {cleaned[:80]}...")
        else:
            unchanged_count += 1
    
    print(f"\n{'='*60}")
    print(f"Results for {style_path.name}:")
    print(f"  ✓ Modified: {changed_count} files")
    print(f"  - Unchanged: {unchanged_count} files")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    # Clean stellar_sketch (style 82)
    style_dir = "resources/style_images/82_stellar_sketch"
    
    print("=" * 60)
    print("Caption Cleaning Script")
    print("=" * 60)
    print(f"Target directory: {style_dir}")
    print("This will remove style tokens from caption files.")
    print("=" * 60)
    
    clean_style_directory(style_dir)
    
    print("\n✅ Done! You can now retrain with clean captions.")
    print("The class_tokens field in your training config will handle the token.")
