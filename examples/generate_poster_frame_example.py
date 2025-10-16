"""
Example script for generating poster frames for custom actors.
Demonstrates how to use the PosterFrameGenerator service.
"""
import os
import sys
import logging
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from poster_frame_generator import PosterFrameGenerator, generate_poster_frame

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def example_generate_poster_frame():
    """Example: Generate a poster frame for a custom actor."""
    
    # Actor information
    actor_id = "0001_european_20_female"
    character_lora_name = "0001_european_20_female"  # The trained LoRA name
    custom_actor_description = "a young European woman with long brown hair, brown eyes, wearing casual clothing"
    
    # Optional: User ID for S3 path organization
    user_id = "user_12345"  # Set to None if not using user-specific paths
    
    logger.info("=" * 80)
    logger.info("POSTER FRAME GENERATION EXAMPLE")
    logger.info("=" * 80)
    logger.info(f"Actor ID: {actor_id}")
    logger.info(f"Character LoRA: {character_lora_name}")
    logger.info(f"Description: {custom_actor_description}")
    logger.info("")
    
    try:
        # Method 1: Using the convenience function
        logger.info("Method 1: Using convenience function")
        result = generate_poster_frame(
            actor_id=actor_id,
            character_lora_name=character_lora_name,
            custom_actor_description=custom_actor_description,
            user_id=user_id,
            # Optional parameters with defaults:
            # style_lora_name="SBai_style_101",
            # style_lora_strength=1.0,
            # character_lora_strength=0.7,
            # width=1024,
            # height=1024,
            # steps=22,
            # seed=None  # None for random
        )
        
        logger.info("✅ Poster frame generated successfully!")
        logger.info(f"Thumbnail URL: {result['thumbnail_image_url']}")
        
    except Exception as e:
        logger.error(f"❌ Error generating poster frame: {str(e)}")
        raise


def example_generate_with_custom_params():
    """Example: Generate poster frame with custom parameters."""
    
    actor_id = "0002_european_35_female"
    character_lora_name = "0002_european_35_female"
    custom_actor_description = "a mature European woman with short blonde hair, blue eyes, professional attire"
    
    logger.info("=" * 80)
    logger.info("POSTER FRAME WITH CUSTOM PARAMETERS")
    logger.info("=" * 80)
    
    try:
        # Method 2: Using the class directly with custom parameters
        generator = PosterFrameGenerator()
        
        result = generator.generate_poster_frame(
            actor_id=actor_id,
            character_lora_name=character_lora_name,
            custom_actor_description=custom_actor_description,
            user_id=None,  # No user-specific path
            style_lora_name="SBai_style_101",  # Custom style LoRA
            style_lora_strength=0.9,  # Slightly lower style strength
            character_lora_strength=0.8,  # Higher character strength
            width=1024,
            height=1024,
            steps=25,  # More steps for higher quality
            seed=42  # Fixed seed for reproducibility
        )
        
        logger.info("✅ Poster frame generated successfully!")
        logger.info(f"Thumbnail URL: {result['thumbnail_image_url']}")
        
    except Exception as e:
        logger.error(f"❌ Error generating poster frame: {str(e)}")
        raise


def example_batch_generate():
    """Example: Generate poster frames for multiple actors."""
    
    actors = [
        {
            "id": "0000_european_16_male",
            "lora": "0000_european_16_male",
            "description": "a teenage European boy with short dark hair, green eyes, casual street wear"
        },
        {
            "id": "0001_european_20_female",
            "lora": "0001_european_20_female",
            "description": "a young European woman with long brown hair, brown eyes, wearing casual clothing"
        },
        {
            "id": "0002_european_35_female",
            "lora": "0002_european_35_female",
            "description": "a mature European woman with short blonde hair, blue eyes, professional attire"
        }
    ]
    
    logger.info("=" * 80)
    logger.info("BATCH POSTER FRAME GENERATION")
    logger.info("=" * 80)
    logger.info(f"Generating poster frames for {len(actors)} actors")
    logger.info("")
    
    generator = PosterFrameGenerator()
    results = []
    
    for i, actor in enumerate(actors, 1):
        logger.info(f"[{i}/{len(actors)}] Processing actor: {actor['id']}")
        
        try:
            result = generator.generate_poster_frame(
                actor_id=actor['id'],
                character_lora_name=actor['lora'],
                custom_actor_description=actor['description'],
                user_id=None
            )
            
            results.append({
                "actor_id": actor['id'],
                "success": True,
                "url": result['thumbnail_image_url']
            })
            
            logger.info(f"  ✅ Success: {result['thumbnail_image_url']}")
            
        except Exception as e:
            logger.error(f"  ❌ Failed: {str(e)}")
            results.append({
                "actor_id": actor['id'],
                "success": False,
                "error": str(e)
            })
        
        logger.info("")
    
    # Summary
    logger.info("=" * 80)
    logger.info("BATCH GENERATION SUMMARY")
    logger.info("=" * 80)
    successful = sum(1 for r in results if r['success'])
    failed = len(results) - successful
    logger.info(f"Total: {len(results)} | Successful: {successful} | Failed: {failed}")
    
    for result in results:
        status = "✅" if result['success'] else "❌"
        logger.info(f"{status} {result['actor_id']}")


if __name__ == "__main__":
    # Check environment variables
    required_vars = [
        "RUNPOD_API_KEY",
        "AWS_ACCESS_KEY",
        "AWS_ACCESS_SECRET",
        "AWS_USER_IMAGES_BUCKET"
    ]
    
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        logger.error("Missing required environment variables:")
        for var in missing_vars:
            logger.error(f"  - {var}")
        sys.exit(1)
    
    # Run examples
    try:
        # Example 1: Basic usage
        example_generate_poster_frame()
        logger.info("\n" + "=" * 80 + "\n")
        
        # Example 2: Custom parameters
        example_generate_with_custom_params()
        logger.info("\n" + "=" * 80 + "\n")
        
        # Example 3: Batch generation
        # Uncomment to run batch generation:
        # example_batch_generate()
        
    except KeyboardInterrupt:
        logger.info("\n\nInterrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"\n\nFatal error: {str(e)}")
        sys.exit(1)
