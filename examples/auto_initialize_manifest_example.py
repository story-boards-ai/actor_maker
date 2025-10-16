"""
Example: Auto-initialize training data manifest when opening training data tab.

This demonstrates how to automatically create/sync the manifest when a user
opens the training data tab for an actor.
"""

import os
import sys
import logging
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from training_data_api import get_training_data_api

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def on_training_data_tab_opened(actor_id: str):
    """
    Called when user opens the training data tab for an actor.
    
    This will:
    1. Scan S3 for existing training images
    2. Create manifest if it doesn't exist
    3. Sync manifest with S3 (detect deletions/additions)
    4. Return all training data
    
    Args:
        actor_id: Actor ID
    """
    logger.info(f"Training data tab opened for actor: {actor_id}")
    
    # Get training data API
    api = get_training_data_api()
    
    # Auto-initialize/sync manifest
    # This scans S3 and creates/updates the manifest automatically
    training_data = api.get_training_data(
        actor_id=actor_id,
        bucket="story-boards-assets",  # Your S3 bucket
        s3_prefix=f"system_actors/training_data/{actor_id}/"  # S3 path
    )
    
    # Display results
    logger.info("=" * 80)
    logger.info(f"TRAINING DATA FOR: {actor_id}")
    logger.info("=" * 80)
    logger.info(f"Total Images: {training_data['total_images']}")
    logger.info(f"Total Generations: {training_data['total_generations']}")
    logger.info(f"Manifest Path: {training_data['manifest_path']}")
    logger.info(f"Created: {training_data['created_at']}")
    logger.info(f"Updated: {training_data['updated_at']}")
    logger.info("")
    
    # Show generations
    logger.info("GENERATIONS:")
    for gen in training_data['generations']:
        logger.info(f"  Generation {gen['generation_id']} ({gen['type']})")
        logger.info(f"    Images: {gen['image_count']}")
        logger.info(f"    Generated: {gen['generated_at']}")
    
    logger.info("")
    
    # Show images
    logger.info(f"IMAGES ({len(training_data['images'])} total):")
    for img in training_data['images'][:5]:  # Show first 5
        logger.info(f"  {img['filename']}")
        logger.info(f"    URL: {img['s3_url']}")
        logger.info(f"    Prompt: {img['prompt_preview']}")
        logger.info(f"    Generated: {img.get('generated_at', 'N/A')}")
    
    if len(training_data['images']) > 5:
        logger.info(f"  ... and {len(training_data['images']) - 5} more")
    
    logger.info("=" * 80)
    
    return training_data


def main():
    """Example usage."""
    
    # Example actor ID
    actor_id = "0001_european_20_female"
    
    # Validate environment
    if not os.getenv("AWS_ACCESS_KEY"):
        logger.error("AWS_ACCESS_KEY environment variable is required")
        sys.exit(1)
    
    try:
        # Simulate opening training data tab
        training_data = on_training_data_tab_opened(actor_id)
        
        # You can now use this data in your frontend
        # For example, send it as JSON response:
        import json
        print("\nJSON Response:")
        print(json.dumps({
            "actor_id": training_data['actor_id'],
            "total_images": training_data['total_images'],
            "images": training_data['images'][:3]  # First 3 for example
        }, indent=2))
        
    except Exception as e:
        logger.error(f"Failed to get training data: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
