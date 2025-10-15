#!/usr/bin/env python3
"""
Migrate Character Data from wm-characters to actor_maker

This script:
1. Copies character base images from wm-characters to actor_maker
2. Copies scene/post frame images from wm-characters to actor_maker
3. Generates a manifest JSON file per actor with:
   - File paths
   - File sizes
   - Creation timestamps
   - Modification timestamps
   - Character metadata
"""

import os
import json
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
import hashlib


class CharacterMigrator:
    def __init__(self, source_root: str, target_root: str):
        """
        Initialize the migrator.
        
        Args:
            source_root: Path to wm-characters directory
            target_root: Path to actor_maker directory
        """
        self.source_root = Path(source_root)
        self.target_root = Path(target_root)
        
        # Source paths
        self.source_characters_dir = self.source_root / "characters"
        self.source_images_dir = self.source_root / "images"
        self.source_characters_json = self.source_root / "characters.json"
        
        # Target paths
        self.target_actors_dir = self.target_root / "data" / "actors"
        self.target_scenes_dir = self.target_root / "data" / "scenes"
        self.target_manifests_dir = self.target_root / "data" / "actor_manifests"
        
        # Create target directories
        self.target_actors_dir.mkdir(parents=True, exist_ok=True)
        self.target_scenes_dir.mkdir(parents=True, exist_ok=True)
        self.target_manifests_dir.mkdir(parents=True, exist_ok=True)
        
        # Load characters metadata
        self.characters = self._load_characters()
        
    def _load_characters(self) -> List[Dict[str, Any]]:
        """Load characters.json from source."""
        if not self.source_characters_json.exists():
            print(f"Error: {self.source_characters_json} not found")
            return []
        
        with open(self.source_characters_json, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _get_file_metadata(self, file_path: Path) -> Dict[str, Any]:
        """
        Get metadata for a file.
        
        Args:
            file_path: Path to the file
            
        Returns:
            Dictionary with file metadata
        """
        if not file_path.exists():
            return None
        
        stat = file_path.stat()
        
        # Calculate file hash
        file_hash = self._calculate_file_hash(file_path)
        
        return {
            "path": str(file_path),
            "relative_path": str(file_path.relative_to(self.source_root)),
            "size_bytes": stat.st_size,
            "size_mb": round(stat.st_size / (1024 * 1024), 2),
            "created_timestamp": stat.st_birthtime,
            "created_date": datetime.fromtimestamp(stat.st_birthtime).isoformat(),
            "modified_timestamp": stat.st_mtime,
            "modified_date": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "md5_hash": file_hash
        }
    
    def _calculate_file_hash(self, file_path: Path) -> str:
        """Calculate MD5 hash of a file."""
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    
    def _move_file_with_metadata(self, source: Path, target: Path) -> Dict[str, Any]:
        """
        Move a file and return its metadata.
        
        Args:
            source: Source file path
            target: Target file path
            
        Returns:
            Metadata dictionary for the moved file
        """
        # Get metadata before moving
        metadata = self._get_file_metadata(source)
        
        if metadata is None:
            return None
        
        # Create target directory if needed
        target.parent.mkdir(parents=True, exist_ok=True)
        
        # Move file
        shutil.move(str(source), str(target))
        
        # Update metadata with new path
        metadata["moved_to"] = str(target)
        metadata["moved_relative_path"] = str(target.relative_to(self.target_root))
        
        return metadata
    
    def _find_character_directory(self, character_id: str, character_name: str) -> Optional[Path]:
        """
        Find the character directory in wm-characters.
        
        Args:
            character_id: Character ID (e.g., "0000")
            character_name: Character name (e.g., "0000_european_16_male")
            
        Returns:
            Path to character directory or None
        """
        # Try exact match first
        char_dir = self.source_characters_dir / character_name
        if char_dir.exists():
            return char_dir
        
        # Try with ID prefix
        for item in self.source_characters_dir.iterdir():
            if item.is_dir() and item.name.startswith(f"{character_id}_"):
                return item
        
        return None
    
    def _get_scene_images_for_character(self, character_id: str, gender: str) -> List[Path]:
        """
        Find all scene images that could be used for this character.
        
        Args:
            character_id: Character ID
            gender: Character gender (male/female)
            
        Returns:
            List of image file paths
        """
        scene_images = []
        
        if not self.source_images_dir.exists():
            return scene_images
        
        # Walk through all scene directories
        for scene_dir in self.source_images_dir.iterdir():
            if not scene_dir.is_dir():
                continue
            
            # Look for gender-specific subdirectory
            gender_dir = scene_dir / gender
            if gender_dir.exists() and gender_dir.is_dir():
                # Get all image files
                for img_file in gender_dir.iterdir():
                    if img_file.is_file() and img_file.suffix.lower() in ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']:
                        scene_images.append(img_file)
        
        return scene_images
    
    def migrate_character(self, character: Dict[str, Any], move_files: bool = True) -> Dict[str, Any]:
        """
        Migrate a single character and generate its manifest.
        
        Args:
            character: Character metadata dictionary
            move_files: Whether to actually move files (False for dry run)
            
        Returns:
            Manifest dictionary for the character
        """
        character_id = character.get('id', 'unknown')
        character_name = character.get('name', 'unknown')
        gender = character.get('sex', 'unknown')
        
        print(f"\nProcessing character: {character_id} - {character_name}")
        
        manifest = {
            "character_id": character_id,
            "character_name": character_name,
            "metadata": character,
            "migration_timestamp": datetime.now().isoformat(),
            "base_images": [],
            "scene_images": [],
            "statistics": {
                "total_files": 0,
                "total_size_bytes": 0,
                "total_size_mb": 0,
                "base_images_count": 0,
                "scene_images_count": 0
            }
        }
        
        # Find character directory
        char_dir = self._find_character_directory(character_id, character_name)
        
        if char_dir is None:
            print(f"  Warning: Character directory not found for {character_id}")
            manifest["status"] = "character_directory_not_found"
            return manifest
        
        # Process base images
        base_image_dir = char_dir / "base_image"
        if base_image_dir.exists():
            for img_file in base_image_dir.iterdir():
                if img_file.is_file():
                    # Target path
                    target_path = self.target_actors_dir / character_name / "base_image" / img_file.name
                    
                    # Move file and get metadata
                    if move_files:
                        file_metadata = self._move_file_with_metadata(img_file, target_path)
                    else:
                        file_metadata = self._get_file_metadata(img_file)
                        file_metadata["would_move_to"] = str(target_path)
                    
                    if file_metadata:
                        manifest["base_images"].append(file_metadata)
                        manifest["statistics"]["base_images_count"] += 1
                        manifest["statistics"]["total_size_bytes"] += file_metadata["size_bytes"]
        else:
            print(f"  Warning: No base_image directory found")
        
        # Process scene images
        scene_images = self._get_scene_images_for_character(character_id, gender)
        print(f"  Found {len(scene_images)} potential scene images for {gender}")
        
        for scene_img in scene_images:
            # Extract scene name from path
            scene_name = scene_img.parent.parent.name  # e.g., "41 firefighter"
            
            # Target path
            target_path = self.target_scenes_dir / scene_name / gender / scene_img.name
            
            # Move file and get metadata
            if move_files:
                file_metadata = self._move_file_with_metadata(scene_img, target_path)
            else:
                file_metadata = self._get_file_metadata(scene_img)
                file_metadata["would_move_to"] = str(target_path)
            
            if file_metadata:
                file_metadata["scene_name"] = scene_name
                manifest["scene_images"].append(file_metadata)
                manifest["statistics"]["scene_images_count"] += 1
                manifest["statistics"]["total_size_bytes"] += file_metadata["size_bytes"]
        
        # Calculate totals
        manifest["statistics"]["total_files"] = (
            manifest["statistics"]["base_images_count"] + 
            manifest["statistics"]["scene_images_count"]
        )
        manifest["statistics"]["total_size_mb"] = round(
            manifest["statistics"]["total_size_bytes"] / (1024 * 1024), 2
        )
        
        manifest["status"] = "success"
        
        return manifest
    
    def migrate_all_characters(self, move_files: bool = True, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Migrate all characters.
        
        Args:
            move_files: Whether to actually move files (False for dry run)
            limit: Optional limit on number of characters to process
            
        Returns:
            List of manifest dictionaries
        """
        manifests = []
        characters_to_process = self.characters[:limit] if limit else self.characters
        
        print(f"Starting migration of {len(characters_to_process)} characters")
        print(f"Move files: {move_files}")
        print(f"Source: {self.source_root}")
        print(f"Target: {self.target_root}")
        
        for idx, character in enumerate(characters_to_process):
            manifest = self.migrate_character(character, move_files=move_files)
            manifests.append(manifest)
            
            # Save individual manifest
            character_id = character.get('id', f'char_{idx}')
            manifest_file = self.target_manifests_dir / f"{character_id}_manifest.json"
            
            with open(manifest_file, 'w', encoding='utf-8') as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
            
            print(f"  Manifest saved: {manifest_file}")
        
        # Save summary manifest
        summary = {
            "migration_date": datetime.now().isoformat(),
            "source_directory": str(self.source_root),
            "target_directory": str(self.target_root),
            "total_characters": len(manifests),
            "total_files": sum(m["statistics"]["total_files"] for m in manifests),
            "total_size_mb": sum(m["statistics"]["total_size_mb"] for m in manifests),
            "characters": [
                {
                    "id": m["character_id"],
                    "name": m["character_name"],
                    "status": m["status"],
                    "files": m["statistics"]["total_files"],
                    "size_mb": m["statistics"]["total_size_mb"]
                }
                for m in manifests
            ]
        }
        
        summary_file = self.target_manifests_dir / "_migration_summary.json"
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        print(f"\n{'='*60}")
        print(f"Migration complete!")
        print(f"Total characters: {summary['total_characters']}")
        print(f"Total files: {summary['total_files']}")
        print(f"Total size: {summary['total_size_mb']} MB")
        print(f"Summary saved: {summary_file}")
        print(f"{'='*60}")
        
        return manifests


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Migrate character data from wm-characters to actor_maker')
    parser.add_argument('--source', type=str, 
                       default='/Users/markusetter/projects/storyboards_ai/wm-characters',
                       help='Path to wm-characters directory')
    parser.add_argument('--target', type=str,
                       default='/Users/markusetter/projects/storyboards_ai/actor_maker',
                       help='Path to actor_maker directory')
    parser.add_argument('--dry-run', action='store_true',
                       help='Generate manifests without moving files')
    parser.add_argument('--limit', type=int, default=None,
                       help='Limit number of characters to process (for testing)')
    
    args = parser.parse_args()
    
    # Initialize migrator
    migrator = CharacterMigrator(args.source, args.target)
    
    # Run migration
    move_files = not args.dry_run
    manifests = migrator.migrate_all_characters(move_files=move_files, limit=args.limit)
    
    print(f"\nProcessed {len(manifests)} characters")


if __name__ == '__main__':
    main()
