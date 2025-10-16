"""
Example script for generating actor training data from a single source image.

This script demonstrates how to use the TrainingDataGenerator to create
20 diverse training images from a single source image using Replicate's
flux-kontext-pro and Topaz Labs upscaling.

Usage:
    python examples/generate_training_data_example.py

Requirements:
    - REPLICATE_API_TOKEN environment variable
    - OPENAI_API_KEY environment variable
    - AWS credentials configured for S3 uploads
"""

import os
import sys
import logging
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from training_data_generator import TrainingDataGenerator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def main():
    """Generate training data from a source image."""
    
    # Configuration
    source_image_url = "https://your-source-image-url.jpg"  # Replace with actual URL
    user_id = "test_user_123"
    actor_id = "test_actor_456"
    
    # Validate environment variables
    if not os.getenv("REPLICATE_API_TOKEN"):
        logger.error("REPLICATE_API_TOKEN environment variable is required")
        sys.exit(1)
    
    if not os.getenv("OPENAI_API_KEY"):
        logger.error("OPENAI_API_KEY environment variable is required")
        sys.exit(1)
    
    logger.info("=" * 80)
    logger.info("ACTOR TRAINING DATA GENERATOR")
    logger.info("=" * 80)
    logger.info(f"Source Image: {source_image_url}")
    logger.info(f"User ID: {user_id}")
    logger.info(f"Actor ID: {actor_id}")
    logger.info("=" * 80)
    
    try:
        # Initialize generator
        generator = TrainingDataGenerator(
            debug_dir="debug/training_data"
        )
        
        # Generate training data
        logger.info("Starting training data generation...")
        result = generator.generate_training_data(
            source_image_url=source_image_url,
            user_id=user_id,
            actor_id=actor_id
        )
        
        # Display results
        logger.info("=" * 80)
        logger.info("GENERATION COMPLETE")
        logger.info("=" * 80)
        logger.info(f"Total Grids Generated: {result['total_grids_generated']}")
        logger.info(f"Total Training Images: {result['total_training_images']}")
        logger.info(f"Target Training Images: 20")
        logger.info("=" * 80)
        
        # Display training image URLs
        logger.info("Training Image URLs:")
        for idx, url in enumerate(result['training_image_urls'], 1):
            logger.info(f"  {idx:2d}. {url}")
        
        logger.info("=" * 80)
        logger.info("Debug images saved to: debug/training_data/")
        logger.info("=" * 80)
        
        return result
        
    except Exception as e:
        logger.error(f"Training data generation failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
