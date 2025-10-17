#!/usr/bin/env python3
"""
Quick test script to verify the evaluation system works.
Tests with a random actor in dry-run mode.
"""

import sys
import logging
import random
from pathlib import Path

# Add src to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root / "src"))

# Load .env file if it exists
try:
    from dotenv import load_dotenv
    env_path = project_root / '.env'
    if env_path.exists():
        load_dotenv(env_path)
        print(f"✅ Loaded .env from {env_path}")
except ImportError:
    print("⚠️  Warning: python-dotenv not installed, .env file not loaded")

from training_data_manifest import TrainingDataManifest
from training_data_evaluator import TrainingDataEvaluator

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def test_evaluation():
    """Test the evaluation system with a random actor."""
    
    logger.info("="*60)
    logger.info("TESTING TRAINING DATA EVALUATION SYSTEM")
    logger.info("="*60)
    
    # Get all actors with training data
    actor_ids = TrainingDataManifest.list_all_actors()
    
    if not actor_ids:
        logger.error("No actors found with training data")
        return False
    
    logger.info(f"Found {len(actor_ids)} actors with training data")
    
    # Pick random actor for testing
    test_actor = random.choice(actor_ids)
    logger.info(f"Testing with random actor: {test_actor}")
    
    # Create evaluator
    evaluator = TrainingDataEvaluator(output_dir="debug/test_evaluation")
    
    # Run evaluation
    logger.info("\nRunning evaluation...")
    evaluation = evaluator.evaluate_actor(test_actor)
    
    if not evaluation:
        logger.error("Evaluation failed!")
        return False
    
    # Display results
    logger.info("\n" + "="*60)
    logger.info("EVALUATION RESULTS")
    logger.info("="*60)
    logger.info(f"Actor: {test_actor}")
    logger.info(f"Total images: {evaluation['total_images']}")
    logger.info(f"")
    logger.info(f"Current Distribution:")
    logger.info(f"  Photorealistic: {evaluation['photorealistic_count']} ({evaluation['photorealistic_percentage']:.1f}%)")
    logger.info(f"  B&W Stylized:   {evaluation['bw_stylized_count']} ({evaluation['bw_stylized_percentage']:.1f}%)")
    logger.info(f"  Color Stylized: {evaluation['color_stylized_count']} ({evaluation['color_stylized_percentage']:.1f}%)")
    logger.info(f"")
    logger.info(f"Target Distribution:")
    logger.info(f"  Photorealistic: 13 (65%)")
    logger.info(f"  B&W Stylized:   4 (20%)")
    logger.info(f"  Color Stylized: 3 (15%)")
    logger.info(f"")
    logger.info(f"Balanced: {'✅ YES' if evaluation['is_balanced'] else '❌ NO'}")
    
    if not evaluation['is_balanced']:
        logger.info(f"")
        logger.info(f"Action Plan:")
        logger.info(f"  Images to delete: {len(evaluation['images_to_delete'])}")
        for item in evaluation['images_to_delete']:
            logger.info(f"    - Image #{item['image_number']} ({item['type']})")
        
        logger.info(f"  Images to generate:")
        for item in evaluation['images_to_generate']:
            logger.info(f"    - {item['count']} {item['type']} images")
    
    logger.info(f"")
    logger.info(f"GPT Analysis:")
    logger.info(f"  {evaluation['gpt_analysis']}")
    logger.info("")
    logger.info(f"Output files saved to: {evaluator.output_dir}/")
    logger.info(f"  - current_composite.jpg (always same file, gets overwritten)")
    logger.info(f"  - {test_actor}_evaluation.json")
    
    logger.info("\n" + "="*60)
    logger.info("✅ TEST COMPLETED SUCCESSFULLY")
    logger.info("="*60)
    
    return True


if __name__ == "__main__":
    try:
        success = test_evaluation()
        sys.exit(0 if success else 1)
    except Exception as e:
        logger.error(f"Test failed with error: {e}", exc_info=True)
        sys.exit(1)
