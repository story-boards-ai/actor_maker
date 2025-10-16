#!/usr/bin/env python3
"""
Background actor training data generator.
Runs independently and continues even if terminal/tab is closed.

Usage:
    python generate_actor_training_data_bg.py --portrait-url <url> --user-id <id> --actor-id <id>
    
Check status:
    python generate_actor_training_data_bg.py --status <actor_id>
"""

import os
import sys
import argparse
import logging
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from actor_training_data_generator import ActorTrainingDataGenerator
from background_runner import BackgroundRunner

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/actor_training_bg.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


def generate_training_data_task(
    portrait_url: str,
    user_id: str,
    actor_id: str,
    actor_type: str = "human",
    actor_sex: str = None,
    runner: BackgroundRunner = None
):
    """
    Task function for generating actor training data.
    This runs in the background and updates progress.
    """
    logger.info("=" * 80)
    logger.info("BACKGROUND ACTOR TRAINING DATA GENERATOR")
    logger.info("=" * 80)
    logger.info(f"Portrait URL: {portrait_url}")
    logger.info(f"User ID: {user_id}")
    logger.info(f"Actor ID: {actor_id}")
    logger.info(f"Actor Type: {actor_type}")
    logger.info(f"Actor Sex: {actor_sex}")
    logger.info("=" * 80)
    
    # Initialize generator
    generator = ActorTrainingDataGenerator(
        debug_dir=f"debug/actor_training_data/{actor_id}",
        batch_size=5
    )
    
    if runner:
        runner.update_progress(10, "Initialized generator")
    
    # Generate training data
    logger.info("Starting training data generation...")
    
    if runner:
        runner.update_progress(20, "Downloading portrait image")
    
    result = generator.generate_training_data(
        portrait_url=portrait_url,
        user_id=user_id,
        actor_id=actor_id,
        actor_type=actor_type,
        actor_sex=actor_sex
    )
    
    if runner:
        runner.update_progress(100, "Training data generation complete")
    
    # Log results
    logger.info("=" * 80)
    logger.info("GENERATION COMPLETE")
    logger.info("=" * 80)
    logger.info(f"Total Training Images: {result['total_training_images']}")
    logger.info(f"Target Training Images: {result['target_training_images']}")
    logger.info("=" * 80)
    
    # Log image URLs
    for idx, url in enumerate(result['training_image_urls'], 1):
        logger.info(f"  {idx:2d}. {url}")
    
    logger.info("=" * 80)
    
    return result


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Background Actor Training Data Generator")
    
    # Generation arguments
    parser.add_argument("--portrait-url", help="URL of the portrait image")
    parser.add_argument("--user-id", help="User ID")
    parser.add_argument("--actor-id", help="Actor ID")
    parser.add_argument("--actor-type", default="human", 
                       choices=["human", "creature", "robotic", "anthropomorphic", "mythical"],
                       help="Type of actor")
    parser.add_argument("--actor-sex", choices=["male", "female"], help="Sex of actor")
    
    # Status check
    parser.add_argument("--status", help="Check status of actor training by actor ID")
    
    args = parser.parse_args()
    
    # Create logs directory
    Path("logs").mkdir(exist_ok=True)
    Path("status").mkdir(exist_ok=True)
    
    # Check status mode
    if args.status:
        status = BackgroundRunner.get_status(f"actor_training_{args.status}")
        
        if not status:
            print(f"No training data generation found for actor: {args.status}")
            sys.exit(1)
        
        print("=" * 80)
        print(f"ACTOR TRAINING STATUS: {args.status}")
        print("=" * 80)
        print(f"Status: {status.get('status')}")
        print(f"Progress: {status.get('progress', 0)}%")
        print(f"Updated: {status.get('updated_at')}")
        
        if status.get('message'):
            print(f"Message: {status.get('message')}")
        
        if status.get('error'):
            print(f"Error: {status.get('error')}")
        
        if status.get('result'):
            result = status['result']
            print(f"\nTotal Images: {result.get('total_training_images')}")
            print(f"Target Images: {result.get('target_training_images')}")
        
        print("=" * 80)
        sys.exit(0)
    
    # Validate generation arguments
    if not all([args.portrait_url, args.user_id, args.actor_id]):
        parser.error("--portrait-url, --user-id, and --actor-id are required for generation")
    
    # Check if already running
    task_name = f"actor_training_{args.actor_id}"
    if BackgroundRunner.is_running(task_name):
        print(f"Training data generation already running for actor: {args.actor_id}")
        print(f"Check status with: python {sys.argv[0]} --status {args.actor_id}")
        sys.exit(1)
    
    # Create background runner
    runner = BackgroundRunner(task_name)
    
    print("=" * 80)
    print("STARTING BACKGROUND TRAINING DATA GENERATION")
    print("=" * 80)
    print(f"Actor ID: {args.actor_id}")
    print(f"Process will continue running even if you close this terminal")
    print(f"")
    print(f"Check status with:")
    print(f"  python {sys.argv[0]} --status {args.actor_id}")
    print(f"")
    print(f"Logs: logs/actor_training_bg.log")
    print(f"Status: status/{task_name}.json")
    print("=" * 80)
    
    try:
        # Run the task
        result = runner.run(
            generate_training_data_task,
            portrait_url=args.portrait_url,
            user_id=args.user_id,
            actor_id=args.actor_id,
            actor_type=args.actor_type,
            actor_sex=args.actor_sex,
            runner=runner
        )
        
        print("\n" + "=" * 80)
        print("TRAINING DATA GENERATION COMPLETED SUCCESSFULLY")
        print("=" * 80)
        print(f"Generated {result['total_training_images']} training images")
        print(f"Check status file for image URLs: status/{task_name}.json")
        print("=" * 80)
        
    except Exception as e:
        print("\n" + "=" * 80)
        print("TRAINING DATA GENERATION FAILED")
        print("=" * 80)
        print(f"Error: {e}")
        print(f"Check logs: logs/actor_training_bg.log")
        print("=" * 80)
        sys.exit(1)


if __name__ == "__main__":
    main()
