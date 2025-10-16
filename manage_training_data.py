#!/usr/bin/env python3
"""
Training data manifest management utility.

Usage:
    # List all actors with training data
    python manage_training_data.py list
    
    # View manifest for an actor
    python manage_training_data.py view <actor_id>
    
    # Export training data for LoRA training
    python manage_training_data.py export <actor_id>
    
    # Add existing images to manifest
    python manage_training_data.py add-existing <actor_id> <image_urls_file>
"""

import sys
import json
import argparse
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from training_data_manifest import TrainingDataManifest


def list_actors():
    """List all actors with training data."""
    actors = TrainingDataManifest.list_all_actors()
    
    if not actors:
        print("No actors with training data found.")
        return
    
    print("=" * 80)
    print(f"ACTORS WITH TRAINING DATA ({len(actors)} total)")
    print("=" * 80)
    
    for actor_id in actors:
        manifest = TrainingDataManifest.load_actor_manifest(actor_id)
        stats = manifest.get_stats()
        
        print(f"\n{actor_id}")
        print(f"  Total Images: {stats['total_images']}")
        print(f"  Generations: {stats['total_generations']}")
        print(f"  Created: {stats['created_at']}")
        print(f"  Updated: {stats['updated_at']}")


def view_manifest(actor_id: str):
    """View detailed manifest for an actor."""
    manifest = TrainingDataManifest.load_actor_manifest(actor_id)
    stats = manifest.get_stats()
    
    print("=" * 80)
    print(f"TRAINING DATA MANIFEST: {actor_id}")
    print("=" * 80)
    print(f"Total Images: {stats['total_images']}")
    print(f"Total Generations: {stats['total_generations']}")
    print(f"Created: {stats['created_at']}")
    print(f"Updated: {stats['updated_at']}")
    print()
    
    # Show generations
    print("GENERATIONS:")
    print("-" * 80)
    for gen in stats['generations']:
        print(f"  Generation {gen['generation_id']} ({gen['type']})")
        print(f"    Generated: {gen['generated_at']}")
        print(f"    Images: {gen['image_count']}")
        if gen.get('metadata'):
            print(f"    Metadata: {json.dumps(gen['metadata'], indent=6)}")
        print()
    
    # Show images
    print("IMAGES:")
    print("-" * 80)
    images = manifest.get_all_images()
    for filename, data in list(images.items())[:10]:  # Show first 10
        print(f"  {filename}")
        print(f"    URL: {data['s3_url']}")
        print(f"    Prompt: {data.get('prompt_preview', data.get('prompt', 'N/A'))}")
        print(f"    Generation: {data.get('generation_id', 'N/A')}")
        print()
    
    if len(images) > 10:
        print(f"  ... and {len(images) - 10} more images")
    
    print("=" * 80)
    print(f"Manifest file: {manifest.manifest_file}")


def export_training_data(actor_id: str, output_file: str = None):
    """Export training data for LoRA training."""
    manifest = TrainingDataManifest.load_actor_manifest(actor_id)
    
    if not output_file:
        output_file = f"data/actors/{actor_id}/training_export.json"
    
    export_data = manifest.export_for_training(output_file)
    
    print("=" * 80)
    print(f"EXPORTED TRAINING DATA: {actor_id}")
    print("=" * 80)
    print(f"Total Images: {export_data['total_images']}")
    print(f"Output File: {output_file}")
    print()
    print("Image URLs:")
    for idx, url in enumerate(export_data['image_urls'][:5], 1):
        print(f"  {idx}. {url}")
    
    if len(export_data['image_urls']) > 5:
        print(f"  ... and {len(export_data['image_urls']) - 5} more")
    
    print("=" * 80)


def add_existing_images(actor_id: str, urls_file: str):
    """Add existing images to manifest."""
    manifest = TrainingDataManifest.load_actor_manifest(actor_id)
    
    # Load URLs from file
    urls_path = Path(urls_file)
    if not urls_path.exists():
        print(f"Error: File not found: {urls_file}")
        sys.exit(1)
    
    # Parse file (JSON or plain text)
    content = urls_path.read_text()
    
    try:
        # Try JSON first
        data = json.loads(content)
        if isinstance(data, list):
            images = data
        elif isinstance(data, dict) and 'images' in data:
            images = data['images']
        else:
            images = [{"s3_url": url} for url in data.values() if isinstance(url, str)]
    except json.JSONDecodeError:
        # Plain text file with one URL per line
        urls = [line.strip() for line in content.split('\n') if line.strip()]
        images = [{"s3_url": url} for url in urls]
    
    if not images:
        print("Error: No images found in file")
        sys.exit(1)
    
    print(f"Adding {len(images)} existing images to manifest...")
    manifest.add_existing_images(images, source=urls_file)
    manifest.save()
    
    print("=" * 80)
    print(f"ADDED EXISTING IMAGES: {actor_id}")
    print("=" * 80)
    print(f"Images Added: {len(images)}")
    print(f"Total Images: {manifest.manifest['total_images']}")
    print(f"Manifest: {manifest.manifest_file}")


def main():
    parser = argparse.ArgumentParser(description="Training Data Manifest Manager")
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # List command
    subparsers.add_parser('list', help='List all actors with training data')
    
    # View command
    view_parser = subparsers.add_parser('view', help='View manifest for an actor')
    view_parser.add_argument('actor_id', help='Actor ID')
    
    # Export command
    export_parser = subparsers.add_parser('export', help='Export training data')
    export_parser.add_argument('actor_id', help='Actor ID')
    export_parser.add_argument('--output', '-o', help='Output file path')
    
    # Add existing command
    add_parser = subparsers.add_parser('add-existing', help='Add existing images to manifest')
    add_parser.add_argument('actor_id', help='Actor ID')
    add_parser.add_argument('urls_file', help='File with image URLs (JSON or text)')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    if args.command == 'list':
        list_actors()
    elif args.command == 'view':
        view_manifest(args.actor_id)
    elif args.command == 'export':
        export_training_data(args.actor_id, args.output)
    elif args.command == 'add-existing':
        add_existing_images(args.actor_id, args.urls_file)


if __name__ == "__main__":
    main()
