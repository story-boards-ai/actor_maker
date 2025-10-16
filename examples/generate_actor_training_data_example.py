"""
Example script for generating actor training data from a single portrait image.

This script demonstrates how to use the ActorTrainingDataGenerator to create
12 diverse training images from a single portrait using cinematic prompts.

The generator creates:
- 2 photorealistic cinematic scenes
- 6 black & white stylized illustrations (pen & ink, graphite, charcoal, woodcut, vector, manga)
- 4 color stylized illustrations (comic book, flat vector, watercolor, gouache)

Usage:
    python examples/generate_actor_training_data_example.py

Requirements:
    - REPLICATE_API_TOKEN environment variable
    - AWS credentials configured for S3 uploads
"""

import os
import sys
import logging
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from actor_training_data_generator import ActorTrainingDataGenerator
from training_data_background import BackgroundTrainingDataGenerator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def main():
    """Generate actor training data from a portrait image."""
    
    # Configuration
    portrait_url = "https://your-portrait-url.jpg"  # Replace with actual URL
    user_id = "test_user_123"
    actor_id = "test_actor_456"
    actor_type = "human"  # Options: "human", "creature", "robotic", "anthropomorphic", "mythical"
    actor_sex = "male"    # Options: "male", "female", None
    
    # Set to True to run in background (can close terminal)
    # Set to False to run in foreground (must keep terminal open)
    run_in_background = True
    
    # Validate environment variables
    if not os.getenv("REPLICATE_API_TOKEN"):
        logger.error("REPLICATE_API_TOKEN environment variable is required")
        sys.exit(1)
    
    logger.info("=" * 80)
    logger.info("ACTOR TRAINING DATA GENERATOR")
    logger.info("=" * 80)
    logger.info(f"Portrait URL: {portrait_url}")
    logger.info(f"User ID: {user_id}")
    logger.info(f"Actor ID: {actor_id}")
    logger.info(f"Actor Type: {actor_type}")
    logger.info(f"Actor Sex: {actor_sex}")
    logger.info(f"Run in Background: {run_in_background}")
    logger.info("=" * 80)
    
    try:
        # Generate training data (with optional background execution)
        logger.info("Starting training data generation...")
        
        if run_in_background:
            logger.info("Running in BACKGROUND mode - you can close this terminal!")
            logger.info(f"Check status with: BackgroundTrainingDataGenerator.get_status('{actor_id}', 'actor')")
        
        result = BackgroundTrainingDataGenerator.generate_actor_training_data(
            portrait_url=portrait_url,
            user_id=user_id,
            actor_id=actor_id,
            actor_type=actor_type,
            actor_sex=actor_sex
        )
        
        # Display results
        logger.info("=" * 80)
        logger.info("GENERATION COMPLETE")
        logger.info("=" * 80)
        logger.info(f"Total Training Images: {result['total_training_images']}")
        logger.info(f"Target Training Images: {result['target_training_images']}")
        logger.info(f"Success Rate: {result['total_training_images']}/{result['target_training_images']}")
        logger.info("=" * 80)
        
        # Display training image URLs
        logger.info("Training Image URLs:")
        logger.info("")
        logger.info("Photorealistic (2 images):")
        for idx in range(min(2, len(result['training_image_urls']))):
            logger.info(f"  {idx + 1:2d}. {result['training_image_urls'][idx]}")
        
        logger.info("")
        logger.info("Black & White Stylized (6 images):")
        for idx in range(2, min(8, len(result['training_image_urls']))):
            logger.info(f"  {idx + 1:2d}. {result['training_image_urls'][idx]}")
        
        logger.info("")
        logger.info("Color Stylized (4 images):")
        for idx in range(8, len(result['training_image_urls'])):
            logger.info(f"  {idx + 1:2d}. {result['training_image_urls'][idx]}")
        
        logger.info("")
        logger.info("=" * 80)
        logger.info("Debug images saved to: debug/actor_training_data/")
        logger.info("  - Individual images: training_data_output_1.jpg, training_data_output_2.jpg, etc.")
        logger.info("  - Grid overview: training_data_grid.jpg")
        logger.info("=" * 80)
        
        return result
        
    except Exception as e:
        logger.error(f"Actor training data generation failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
