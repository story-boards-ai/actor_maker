#!/usr/bin/env python3
"""
Show statistics about training data across all actors.
Useful for understanding the current state before running evaluations.
"""

import sys
import logging
from pathlib import Path
from typing import Dict, List

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from training_data_manifest import TrainingDataManifest

# Setup logging
logging.basicConfig(
    level=logging.WARNING,  # Only show warnings/errors
    format='%(message)s'
)
logger = logging.getLogger(__name__)


def show_stats():
    """Show statistics about all actors with training data."""
    
    print("="*70)
    print("TRAINING DATA STATISTICS")
    print("="*70)
    print()
    
    # Get all actors
    actor_ids = TrainingDataManifest.list_all_actors()
    
    if not actor_ids:
        print("❌ No actors found with training data")
        return
    
    print(f"Found {len(actor_ids)} actors with training data\n")
    
    # Collect statistics
    stats: List[Dict] = []
    total_images = 0
    
    for actor_id in actor_ids:
        try:
            manifest = TrainingDataManifest.load_actor_manifest(actor_id)
            images = manifest.get_all_images()
            image_count = len(images)
            total_images += image_count
            
            stats.append({
                "actor_id": actor_id,
                "image_count": image_count,
                "generations": len(manifest.manifest.get("generations", []))
            })
        except Exception as e:
            logger.error(f"Failed to load {actor_id}: {e}")
    
    # Sort by image count
    stats.sort(key=lambda x: x["image_count"], reverse=True)
    
    # Distribution analysis
    target_count = 20
    balanced = sum(1 for s in stats if s["image_count"] == target_count)
    under = sum(1 for s in stats if s["image_count"] < target_count)
    over = sum(1 for s in stats if s["image_count"] > target_count)
    
    # Show summary
    print("SUMMARY")
    print("-" * 70)
    print(f"Total actors:        {len(stats)}")
    print(f"Total images:        {total_images}")
    print(f"Average per actor:   {total_images / len(stats):.1f}")
    print()
    print(f"Target count:        {target_count} images per actor")
    print(f"  Exactly target:    {balanced} actors ({balanced/len(stats)*100:.1f}%)")
    print(f"  Under target:      {under} actors ({under/len(stats)*100:.1f}%)")
    print(f"  Over target:       {over} actors ({over/len(stats)*100:.1f}%)")
    print()
    
    # Show distribution histogram
    print("DISTRIBUTION")
    print("-" * 70)
    
    # Group by count
    count_groups: Dict[int, int] = {}
    for s in stats:
        count = s["image_count"]
        count_groups[count] = count_groups.get(count, 0) + 1
    
    # Show histogram
    for count in sorted(count_groups.keys()):
        actors = count_groups[count]
        bar = "█" * min(actors, 50)  # Max 50 chars
        marker = " ← TARGET" if count == target_count else ""
        print(f"{count:3d} images: {bar} ({actors} actors){marker}")
    
    print()
    
    # Show top/bottom actors
    print("TOP 10 ACTORS (Most Images)")
    print("-" * 70)
    for i, s in enumerate(stats[:10], 1):
        print(f"{i:2d}. {s['actor_id']}: {s['image_count']} images ({s['generations']} generations)")
    
    print()
    print("BOTTOM 10 ACTORS (Fewest Images)")
    print("-" * 70)
    for i, s in enumerate(stats[-10:], 1):
        print(f"{i:2d}. {s['actor_id']}: {s['image_count']} images ({s['generations']} generations)")
    
    print()
    print("="*70)
    
    # Recommendations
    if under > 0 or over > 0:
        print()
        print("💡 RECOMMENDATIONS")
        print("-" * 70)
        if under > 0:
            print(f"• {under} actors need MORE images (under {target_count})")
        if over > 0:
            print(f"• {over} actors need FEWER images (over {target_count})")
        print()
        print("Run evaluation to see detailed breakdown:")
        print("  python scripts/training_data/evaluate_and_balance.py --all --dry-run")
        print()


if __name__ == "__main__":
    try:
        show_stats()
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        sys.exit(1)
