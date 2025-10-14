"""
Example script demonstrating image generation with styles.

This script shows how to:
1. Generate images using the ImageGenerator
2. Use styles from the registry
3. Save images to style folders
4. Batch generate multiple images

Make sure to set up your .env file with:
- RUNPOD_API_KEY
- RUNPOD_SERVER_100_ID
"""
import os
import sys
import logging
from pathlib import Path
from dotenv import load_dotenv

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.utils.image_generator import ImageGenerator, generate_image_with_style
from src.styles.styles_registry import StylesRegistry

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def example_simple_generation():
    """Example 1: Simple image generation with a style."""
    logger.info("=" * 60)
    logger.info("Example 1: Simple image generation")
    logger.info("=" * 60)
    
    result = generate_image_with_style(
        prompt="A detective standing in the rain under a streetlight, noir atmosphere",
        style_id="1",  # Ink Intensity style
        steps=20,
        width=1360,
        height=768
    )
    
    if result:
        logger.info(f"✅ Success! Image saved to: {result['saved_path']}")
        logger.info(f"   Seed: {result['seed']}")
        logger.info(f"   Style: {result['metadata']['style_title']}")
    else:
        logger.error("❌ Generation failed")


def example_batch_generation():
    """Example 2: Batch generate multiple images."""
    logger.info("=" * 60)
    logger.info("Example 2: Batch generation")
    logger.info("=" * 60)
    
    generator = ImageGenerator()
    
    prompts = [
        "A lone figure walking through a foggy street",
        "A dramatic close-up of hands holding a gun",
        "A silhouette against a bright window"
    ]
    
    results = generator.generate_batch(
        prompts=prompts,
        style_id="1",  # Ink Intensity
        steps=15,  # Faster for batch
        width=1360,
        height=768
    )
    
    successful = [r for r in results if r is not None]
    logger.info(f"✅ Generated {len(successful)}/{len(prompts)} images successfully")


def example_list_styles():
    """Example 3: List available styles."""
    logger.info("=" * 60)
    logger.info("Example 3: List available styles")
    logger.info("=" * 60)
    
    registry = StylesRegistry()
    styles = registry.get_all_styles()
    
    logger.info(f"Found {len(styles)} styles in registry:\n")
    
    for style in styles[:10]:  # Show first 10
        logger.info(
            f"  ID: {style['id']:3s} | {style['title']:25s} | "
            f"LoRA: {style['lora_name']}"
        )
    
    if len(styles) > 10:
        logger.info(f"  ... and {len(styles) - 10} more")


def example_custom_settings():
    """Example 4: Generate with custom settings."""
    logger.info("=" * 60)
    logger.info("Example 4: Custom generation settings")
    logger.info("=" * 60)
    
    generator = ImageGenerator()
    
    result = generator.generate_image(
        prompt="A cyberpunk cityscape at night with neon lights",
        style_id="16",  # Dynamic Simplicity
        width=1360,
        height=768,
        steps=25,  # More steps for quality
        seed=12345,  # Fixed seed for reproducibility
        save_to_style=True,
        filename="cyberpunk_city.png"  # Custom filename
    )
    
    if result:
        logger.info(f"✅ Image generated with custom settings")
        logger.info(f"   Saved to: {result['saved_path']}")
        logger.info(f"   Using seed: {result['seed']}")


def main():
    """Run all examples."""
    # Check environment
    if not os.getenv("RUNPOD_API_KEY"):
        logger.error("❌ RUNPOD_API_KEY not set in environment")
        logger.error("   Please set up your .env file")
        return
    
    if not os.getenv("RUNPOD_SERVER_100_ID"):
        logger.error("❌ RUNPOD_SERVER_100_ID not set in environment")
        logger.error("   Please set up your .env file")
        return
    
    logger.info("Environment variables loaded successfully\n")
    
    # Run examples
    try:
        # List available styles first
        example_list_styles()
        print("\n")
        
        # Simple generation
        example_simple_generation()
        print("\n")
        
        # Custom settings
        example_custom_settings()
        print("\n")
        
        # Batch generation (commented out by default as it takes time)
        # example_batch_generation()
        # print("\n")
        
        logger.info("=" * 60)
        logger.info("All examples completed!")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"Error running examples: {e}", exc_info=True)


if __name__ == "__main__":
    main()
