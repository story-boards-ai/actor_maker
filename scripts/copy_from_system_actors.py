#!/usr/bin/env python3
"""
Copy training data and poster frames from system_actors to actor_maker.

This script:
1. Copies the characters.json file
2. Copies all training_data and poster_frame folders for each character
3. Preserves the directory structure
"""

import os
import shutil
import json
from pathlib import Path
from typing import Dict, Any, List

class SystemActorsDataCopier:
    def __init__(self, source_root: str, target_root: str):
        """
        Initialize the copier.
        
        Args:
            source_root: Path to system_actors repository
            target_root: Path to actor_maker repository
        """
        self.source_root = Path(source_root)
        self.target_root = Path(target_root)
        
        # Validate paths
        if not self.source_root.exists():
            raise ValueError(f"Source directory does not exist: {source_root}")
        if not self.target_root.exists():
            raise ValueError(f"Target directory does not exist: {target_root}")
    
    def copy_characters_json(self) -> None:
        """Copy the main characters.json file, preserving 'good' flags from existing data."""
        source_file = self.source_root / "characters.json"
        target_file = self.target_root / "data" / "actorsData.json"
        
        if not source_file.exists():
            print(f"Warning: Source file not found: {source_file}")
            return
        
        # Create target directory if needed
        target_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Load source data
        with open(source_file, 'r') as f:
            source_data = json.load(f)
        
        # Load existing target data to preserve 'good' flags
        existing_good_flags = {}
        if target_file.exists():
            try:
                with open(target_file, 'r') as f:
                    existing_data = json.load(f)
                    # Build a map of actor_id -> good flag
                    for actor in existing_data:
                        actor_id = actor.get('id')
                        if actor_id is not None and 'good' in actor:
                            existing_good_flags[actor_id] = actor['good']
                print(f"  Preserving {len(existing_good_flags)} 'good' flags from existing data")
            except Exception as e:
                print(f"  Warning: Could not load existing data to preserve flags: {e}")
        
        # Merge: update source data with preserved 'good' flags
        for actor in source_data:
            actor_id = actor.get('id')
            if actor_id in existing_good_flags:
                actor['good'] = existing_good_flags[actor_id]
        
        # Save merged data
        with open(target_file, 'w') as f:
            json.dump(source_data, f, indent=2)
        
        print(f"✓ Copied characters.json -> actorsData.json (preserved 'good' flags)")
        
        # Also create a TypeScript version using the merged data
        target_ts = self.target_root / "data" / "actorsData.ts"
        with open(target_ts, 'w') as f:
            f.write("// Auto-generated from system_actors/characters.json\n")
            f.write("// This file contains all actor metadata including poster frames and LoRA URLs\n\n")
            f.write("export const actorsLibraryData = ")
            json.dump(source_data, f, indent=2)  # Use merged source_data instead of reloading
            f.write(";\n")
        
        print(f"✓ Created TypeScript version: actorsData.ts (with preserved 'good' flags)")
    
    def copy_character_data(self, character_name: str, copy_count: Dict[str, int]) -> bool:
        """
        Copy training_data and poster_frame folders for a single character.
        
        Args:
            character_name: Name of the character folder (e.g., "0000_european_16_male")
            copy_count: Dictionary to track copy statistics
            
        Returns:
            True if successful, False otherwise
        """
        source_char_dir = self.source_root / "characters" / character_name
        target_char_dir = self.target_root / "data" / "actors" / character_name
        
        if not source_char_dir.exists():
            print(f"  Warning: Source directory not found: {source_char_dir}")
            return False
        
        # Create target directory
        target_char_dir.mkdir(parents=True, exist_ok=True)
        
        # Copy training_data folder
        source_training = source_char_dir / "training_data"
        target_training = target_char_dir / "training_data"
        
        if source_training.exists():
            if target_training.exists():
                shutil.rmtree(target_training)
            shutil.copytree(source_training, target_training)
            copy_count['training_data'] += 1
            
            # Count files
            file_count = len(list(target_training.rglob('*')))
            copy_count['training_files'] += file_count
        
        # Copy poster_frame folder
        source_poster = source_char_dir / "poster_frame"
        target_poster = target_char_dir / "poster_frame"
        
        if source_poster.exists():
            if target_poster.exists():
                shutil.rmtree(target_poster)
            shutil.copytree(source_poster, target_poster)
            copy_count['poster_frames'] += 1
            
            # Count files
            file_count = len(list(target_poster.rglob('*')))
            copy_count['poster_files'] += file_count
        
        return True
    
    def copy_all_character_data(self, limit: int = None) -> Dict[str, int]:
        """
        Copy all character data from system_actors.
        
        Args:
            limit: Optional limit on number of characters to process
            
        Returns:
            Dictionary with copy statistics
        """
        source_chars_dir = self.source_root / "characters"
        
        if not source_chars_dir.exists():
            print(f"Error: Characters directory not found: {source_chars_dir}")
            return {}
        
        # Get all character directories
        char_dirs = sorted([d.name for d in source_chars_dir.iterdir() if d.is_dir()])
        
        if limit:
            char_dirs = char_dirs[:limit]
        
        print(f"\nCopying data for {len(char_dirs)} characters...")
        print("=" * 70)
        
        copy_count = {
            'total_characters': 0,
            'training_data': 0,
            'poster_frames': 0,
            'training_files': 0,
            'poster_files': 0,
            'failed': 0
        }
        
        for i, char_name in enumerate(char_dirs, 1):
            if i % 10 == 0 or i == 1:
                print(f"Processing {i}/{len(char_dirs)}: {char_name}")
            
            if self.copy_character_data(char_name, copy_count):
                copy_count['total_characters'] += 1
            else:
                copy_count['failed'] += 1
        
        return copy_count
    
    def create_gitignore(self) -> None:
        """Create .gitignore files to exclude image data from git."""
        actors_dir = self.target_root / "data" / "actors"
        
        # Create .gitignore in actors directory
        gitignore_content = """# Ignore all image and binary files
*.png
*.jpg
*.jpeg
*.webp
*.safetensors

# Keep JSON metadata files
!*.json

# Keep directory structure
!.gitkeep
"""
        
        gitignore_file = actors_dir / ".gitignore"
        with open(gitignore_file, 'w') as f:
            f.write(gitignore_content)
        
        print(f"✓ Created .gitignore in {actors_dir}")
        
        # Create .gitkeep to preserve directory structure
        gitkeep_file = actors_dir / ".gitkeep"
        gitkeep_file.touch()
        print(f"✓ Created .gitkeep in {actors_dir}")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Copy training data and poster frames from system_actors to actor_maker"
    )
    parser.add_argument(
        "--source",
        default="/Users/markusetter/projects/storyboards_ai/system_actors",
        help="Path to system_actors repository"
    )
    parser.add_argument(
        "--target",
        default="/Users/markusetter/projects/storyboards_ai/actor_maker",
        help="Path to actor_maker repository"
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Limit number of characters to process (for testing)"
    )
    parser.add_argument(
        "--skip-json",
        action="store_true",
        help="Skip copying characters.json file"
    )
    
    args = parser.parse_args()
    
    print("=" * 70)
    print("SYSTEM ACTORS DATA COPIER")
    print("=" * 70)
    print(f"Source: {args.source}")
    print(f"Target: {args.target}")
    if args.limit:
        print(f"Limit: {args.limit} characters")
    print()
    
    try:
        copier = SystemActorsDataCopier(args.source, args.target)
        
        # Copy characters.json
        if not args.skip_json:
            copier.copy_characters_json()
            print()
        
        # Copy all character data
        stats = copier.copy_all_character_data(limit=args.limit)
        
        # Create .gitignore
        copier.create_gitignore()
        
        # Print summary
        print()
        print("=" * 70)
        print("COPY SUMMARY")
        print("=" * 70)
        print(f"Total characters processed: {stats['total_characters']}")
        print(f"Training data folders copied: {stats['training_data']}")
        print(f"Poster frame folders copied: {stats['poster_frames']}")
        print(f"Total training files: {stats['training_files']}")
        print(f"Total poster files: {stats['poster_files']}")
        print(f"Failed: {stats['failed']}")
        print("=" * 70)
        print("✓ Copy completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
