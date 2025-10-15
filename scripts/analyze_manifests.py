#!/usr/bin/env python3
"""
Analyze Actor Manifests

This script analyzes the generated actor manifests and provides statistics
and insights about the migrated data.
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Any
from collections import defaultdict


def load_manifests(manifests_dir: str) -> List[Dict[str, Any]]:
    """Load all actor manifests from directory."""
    manifests = []
    manifests_path = Path(manifests_dir)
    
    for manifest_file in manifests_path.glob("*_manifest.json"):
        with open(manifest_file, 'r', encoding='utf-8') as f:
            manifests.append(json.load(f))
    
    return manifests


def analyze_manifests(manifests: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze manifests and generate statistics."""
    
    # Initialize counters
    stats = {
        "total_characters": len(manifests),
        "total_files": 0,
        "total_size_mb": 0,
        "total_base_images": 0,
        "total_scene_images": 0,
        "by_gender": defaultdict(lambda: {"count": 0, "files": 0, "size_mb": 0}),
        "by_ethnicity": defaultdict(lambda: {"count": 0, "files": 0, "size_mb": 0}),
        "by_age_group": defaultdict(lambda: {"count": 0, "files": 0, "size_mb": 0}),
        "scene_distribution": defaultdict(int),
        "characters_missing_base": [],
        "largest_characters": [],
        "smallest_characters": []
    }
    
    # Analyze each manifest
    for manifest in manifests:
        char_stats = manifest.get("statistics", {})
        metadata = manifest.get("metadata", {})
        
        # Total counts
        stats["total_files"] += char_stats.get("total_files", 0)
        stats["total_size_mb"] += char_stats.get("total_size_mb", 0)
        stats["total_base_images"] += char_stats.get("base_images_count", 0)
        stats["total_scene_images"] += char_stats.get("scene_images_count", 0)
        
        # By gender
        gender = metadata.get("sex", "unknown")
        stats["by_gender"][gender]["count"] += 1
        stats["by_gender"][gender]["files"] += char_stats.get("total_files", 0)
        stats["by_gender"][gender]["size_mb"] += char_stats.get("total_size_mb", 0)
        
        # By ethnicity
        ethnicity = metadata.get("ethnicity", "unknown")
        stats["by_ethnicity"][ethnicity]["count"] += 1
        stats["by_ethnicity"][ethnicity]["files"] += char_stats.get("total_files", 0)
        stats["by_ethnicity"][ethnicity]["size_mb"] += char_stats.get("total_size_mb", 0)
        
        # By age group
        age = int(metadata.get("age", 0))
        if age < 18:
            age_group = "child (0-17)"
        elif age < 30:
            age_group = "young adult (18-29)"
        elif age < 50:
            age_group = "adult (30-49)"
        elif age < 70:
            age_group = "senior (50-69)"
        else:
            age_group = "elderly (70+)"
        
        stats["by_age_group"][age_group]["count"] += 1
        stats["by_age_group"][age_group]["files"] += char_stats.get("total_files", 0)
        stats["by_age_group"][age_group]["size_mb"] += char_stats.get("total_size_mb", 0)
        
        # Scene distribution
        for scene_img in manifest.get("scene_images", []):
            scene_name = scene_img.get("scene_name", "unknown")
            stats["scene_distribution"][scene_name] += 1
        
        # Missing base images
        if char_stats.get("base_images_count", 0) == 0:
            stats["characters_missing_base"].append({
                "id": manifest.get("character_id"),
                "name": manifest.get("character_name")
            })
        
        # Track for largest/smallest
        stats["largest_characters"].append({
            "id": manifest.get("character_id"),
            "name": manifest.get("character_name"),
            "size_mb": char_stats.get("total_size_mb", 0),
            "files": char_stats.get("total_files", 0)
        })
    
    # Sort and limit largest/smallest
    stats["largest_characters"] = sorted(
        stats["largest_characters"], 
        key=lambda x: x["size_mb"], 
        reverse=True
    )[:10]
    
    stats["smallest_characters"] = sorted(
        stats["largest_characters"], 
        key=lambda x: x["size_mb"]
    )[:10]
    
    return stats


def print_analysis(stats: Dict[str, Any]):
    """Print formatted analysis."""
    
    print("\n" + "="*70)
    print("ACTOR MANIFESTS ANALYSIS")
    print("="*70)
    
    # Overall statistics
    print(f"\n📊 OVERALL STATISTICS")
    print(f"  Total Characters: {stats['total_characters']}")
    print(f"  Total Files: {stats['total_files']:,}")
    print(f"  Total Size: {stats['total_size_mb']:,.2f} MB ({stats['total_size_mb']/1024:.2f} GB)")
    print(f"  Base Images: {stats['total_base_images']:,}")
    print(f"  Scene Images: {stats['total_scene_images']:,}")
    print(f"  Avg Files per Character: {stats['total_files']/stats['total_characters']:.1f}")
    print(f"  Avg Size per Character: {stats['total_size_mb']/stats['total_characters']:.2f} MB")
    
    # By gender
    print(f"\n👥 BY GENDER")
    for gender, data in sorted(stats['by_gender'].items()):
        print(f"  {gender.capitalize()}:")
        print(f"    Characters: {data['count']}")
        print(f"    Files: {data['files']:,}")
        print(f"    Size: {data['size_mb']:,.2f} MB")
        print(f"    Avg per character: {data['size_mb']/data['count']:.2f} MB")
    
    # By ethnicity
    print(f"\n🌍 BY ETHNICITY")
    for ethnicity, data in sorted(stats['by_ethnicity'].items(), key=lambda x: x[1]['count'], reverse=True):
        print(f"  {ethnicity.capitalize()}:")
        print(f"    Characters: {data['count']}")
        print(f"    Size: {data['size_mb']:,.2f} MB")
    
    # By age group
    print(f"\n🎂 BY AGE GROUP")
    age_order = [
        "child (0-17)",
        "young adult (18-29)",
        "adult (30-49)",
        "senior (50-69)",
        "elderly (70+)"
    ]
    for age_group in age_order:
        if age_group in stats['by_age_group']:
            data = stats['by_age_group'][age_group]
            print(f"  {age_group}:")
            print(f"    Characters: {data['count']}")
            print(f"    Size: {data['size_mb']:,.2f} MB")
    
    # Scene distribution (top 10)
    print(f"\n🎬 TOP 10 SCENES (by image count)")
    sorted_scenes = sorted(stats['scene_distribution'].items(), key=lambda x: x[1], reverse=True)[:10]
    for scene, count in sorted_scenes:
        print(f"  {scene}: {count:,} images")
    
    # Largest characters
    print(f"\n📦 TOP 10 LARGEST CHARACTERS")
    for i, char in enumerate(stats['largest_characters'], 1):
        print(f"  {i}. {char['name']}: {char['size_mb']:.2f} MB ({char['files']} files)")
    
    # Missing base images
    if stats['characters_missing_base']:
        print(f"\n⚠️  CHARACTERS MISSING BASE IMAGES ({len(stats['characters_missing_base'])})")
        for char in stats['characters_missing_base'][:10]:
            print(f"  - {char['name']} (ID: {char['id']})")
        if len(stats['characters_missing_base']) > 10:
            print(f"  ... and {len(stats['characters_missing_base']) - 10} more")
    else:
        print(f"\n✅ All characters have base images")
    
    print("\n" + "="*70)


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Analyze actor manifests')
    parser.add_argument('--manifests-dir', type=str,
                       default='/Users/markusetter/projects/storyboards_ai/actor_maker/data/actor_manifests',
                       help='Path to actor_manifests directory')
    parser.add_argument('--output', type=str, default=None,
                       help='Optional output file for JSON report')
    
    args = parser.parse_args()
    
    # Load manifests
    print(f"Loading manifests from: {args.manifests_dir}")
    manifests = load_manifests(args.manifests_dir)
    print(f"Loaded {len(manifests)} manifests")
    
    # Analyze
    stats = analyze_manifests(manifests)
    
    # Print analysis
    print_analysis(stats)
    
    # Save to file if requested
    if args.output:
        output_path = Path(args.output)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(stats, f, indent=2, ensure_ascii=False, default=str)
        print(f"\n📄 Analysis saved to: {output_path}")


if __name__ == '__main__':
    main()
