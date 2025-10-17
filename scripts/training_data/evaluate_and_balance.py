#!/usr/bin/env python3
"""
Main script for evaluating and balancing actor training data.

This script:
1. Loads all actors with training data
2. Creates composite images for GPT evaluation
3. Evaluates training data mix (photorealistic vs B&W vs stylized)
4. Identifies images to delete and types to generate
5. Generates missing training images

Usage:
    python scripts/training_data/evaluate_and_balance.py --dry-run
    python scripts/training_data/evaluate_and_balance.py --actor-id 0000
    python scripts/training_data/evaluate_and_balance.py --all
"""

import argparse
import logging
import sys
from pathlib import Path
from typing import Optional

# Add src to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root / "src"))

# Load .env file if it exists
try:
    from dotenv import load_dotenv
    env_path = project_root / '.env'
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass  # dotenv not installed, rely on system environment

from training_data_evaluator import TrainingDataEvaluator
from training_data_balancer import TrainingDataBalancer
from progress_tracker import ProgressTracker

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def evaluate_actor(
    actor_id: str,
    dry_run: bool = True,
    output_dir: Optional[str] = None
) -> dict:
    """
    Evaluate and balance training data for a single actor.
    
    Args:
        actor_id: Actor ID to process
        dry_run: If True, only evaluate without making changes
        output_dir: Optional output directory for debug files
        
    Returns:
        Dictionary with evaluation results and actions taken
    """
    logger.info(f"{'[DRY-RUN] ' if dry_run else ''}Processing actor: {actor_id}")
    
    # Step 1: Evaluate current training data
    evaluator = TrainingDataEvaluator(output_dir=output_dir)
    evaluation = evaluator.evaluate_actor(actor_id)
    
    if not evaluation:
        logger.error(f"Failed to evaluate actor {actor_id}")
        return {"success": False, "actor_id": actor_id}
    
    # Log evaluation results
    logger.info(f"Evaluation complete for {actor_id}:")
    logger.info(f"  Total images: {evaluation['total_images']}")
    logger.info(f"  Photorealistic: {evaluation['photorealistic_count']} ({evaluation['photorealistic_percentage']:.1f}%)")
    logger.info(f"  B&W Stylized: {evaluation['bw_stylized_count']} ({evaluation['bw_stylized_percentage']:.1f}%)")
    logger.info(f"  Color Stylized: {evaluation['color_stylized_count']} ({evaluation['color_stylized_percentage']:.1f}%)")
    
    # Check if balancing is needed
    if evaluation['is_balanced']:
        logger.info(f"✅ Actor {actor_id} training data is already balanced!")
        return {
            "success": True,
            "actor_id": actor_id,
            "already_balanced": True,
            "evaluation": evaluation
        }
    
    logger.info(f"⚠️  Actor {actor_id} needs balancing")
    logger.info(f"  To delete: {len(evaluation['images_to_delete'])}")
    logger.info(f"  To generate: {len(evaluation['images_to_generate'])}")
    
    if dry_run:
        logger.info("[DRY-RUN] Skipping actual deletion and generation")
        return {
            "success": True,
            "actor_id": actor_id,
            "dry_run": True,
            "evaluation": evaluation
        }
    
    # Step 2: Balance training data (delete excess, generate missing)
    balancer = TrainingDataBalancer()
    balance_result = balancer.balance_actor(actor_id, evaluation)
    
    logger.info(f"✅ Balancing complete for {actor_id}")
    logger.info(f"  Deleted: {balance_result['deleted_count']} images")
    logger.info(f"  Generated: {balance_result['generated_count']} images")
    
    return {
        "success": True,
        "actor_id": actor_id,
        "evaluation": evaluation,
        "balance_result": balance_result
    }


def evaluate_all_actors(
    dry_run: bool = True,
    output_dir: Optional[str] = None,
    resume: bool = True
) -> dict:
    """
    Evaluate and balance all actors with training data.
    
    Args:
        dry_run: If True, only evaluate without making changes
        output_dir: Optional output directory for debug files
        resume: If True, resume from previous progress
        
    Returns:
        Dictionary with summary of all actors processed
    """
    from training_data_manifest import TrainingDataManifest
    
    # Initialize progress tracker
    tracker = ProgressTracker()
    
    # Get all actors with training data
    all_actor_ids = TrainingDataManifest.list_all_actors()
    
    if not all_actor_ids:
        logger.warning("No actors found with training data")
        return {"success": False, "message": "No actors found"}
    
    # Check if we can resume
    if resume and tracker.can_resume():
        logger.info("="*60)
        logger.info("RESUMING FROM PREVIOUS PROGRESS")
        logger.info("="*60)
        tracker.print_summary()
        
        # Get remaining actors
        actor_ids = tracker.get_remaining_actors(all_actor_ids)
        logger.info(f"Resuming with {len(actor_ids)} remaining actors")
    else:
        # Start fresh
        if not resume:
            logger.info("Starting fresh (--no-resume flag)")
            tracker.reset()
        
        actor_ids = all_actor_ids
        tracker.start(len(actor_ids))
        logger.info(f"Found {len(actor_ids)} actors with training data")
    
    results = []
    
    try:
        for idx, actor_id in enumerate(actor_ids, 1):
            # Mark as processing
            tracker.mark_processing(actor_id)
            
            logger.info(f"\n{'='*60}")
            logger.info(f"Processing actor {idx}/{len(actor_ids)}: {actor_id}")
            logger.info(f"Overall progress: {tracker.get_progress_percentage():.1f}%")
            logger.info(f"{'='*60}\n")
            
            try:
                result = evaluate_actor(actor_id, dry_run=dry_run, output_dir=output_dir)
                results.append(result)
                
                # Mark as completed
                tracker.mark_completed(actor_id, result)
                
            except KeyboardInterrupt:
                logger.info("\n\n⚠️  Interrupted by user (Ctrl+C)")
                logger.info("Progress has been saved. Run again with --resume to continue.")
                tracker.print_summary()
                raise
                
            except Exception as e:
                logger.error(f"Failed to process actor {actor_id}: {e}")
                tracker.mark_failed(actor_id, str(e))
                results.append({
                    "success": False,
                    "actor_id": actor_id,
                    "error": str(e)
                })
    
    except KeyboardInterrupt:
        # Re-raise to exit cleanly
        raise
    
    # Final summary
    successful = sum(1 for r in results if r.get("success"))
    already_balanced = sum(1 for r in results if r.get("already_balanced"))
    
    logger.info(f"\n{'='*60}")
    logger.info(f"FINAL SUMMARY")
    logger.info(f"{'='*60}")
    logger.info(f"Processed: {len(results)} actors in this session")
    logger.info(f"  Successful: {successful}")
    logger.info(f"  Already balanced: {already_balanced}")
    logger.info(f"  Failed: {len(results) - successful}")
    logger.info(f"")
    
    # Show overall progress
    tracker.print_summary()
    
    return {
        "success": True,
        "total_actors": len(results),
        "successful": successful,
        "already_balanced": already_balanced,
        "results": results,
        "progress": tracker.get_summary()
    }


def main():
    parser = argparse.ArgumentParser(
        description="Evaluate and balance actor training data"
    )
    parser.add_argument(
        "--actor-id",
        type=str,
        help="Process a specific actor by ID"
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Process all actors with training data"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=True,
        help="Only evaluate without making changes (default: True)"
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually execute deletions and generations (overrides --dry-run)"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="debug/training_data_evaluation",
        help="Output directory for debug files"
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        default=True,
        help="Resume from previous progress (default: True)"
    )
    parser.add_argument(
        "--no-resume",
        action="store_true",
        help="Start fresh, ignore previous progress"
    )
    parser.add_argument(
        "--show-progress",
        action="store_true",
        help="Show current progress and exit"
    )
    parser.add_argument(
        "--reset-progress",
        action="store_true",
        help="Reset progress and exit"
    )
    
    args = parser.parse_args()
    
    # Handle progress commands
    if args.show_progress:
        tracker = ProgressTracker()
        tracker.print_summary()
        sys.exit(0)
    
    if args.reset_progress:
        tracker = ProgressTracker()
        tracker.reset()
        logger.info("✅ Progress reset")
        sys.exit(0)
    
    # Determine dry-run mode
    dry_run = not args.execute
    
    if not args.actor_id and not args.all:
        parser.error("Must specify either --actor-id or --all")
    
    try:
        if args.actor_id:
            result = evaluate_actor(
                args.actor_id,
                dry_run=dry_run,
                output_dir=args.output_dir
            )
        else:
            # Determine resume mode
            resume = not args.no_resume
            
            result = evaluate_all_actors(
                dry_run=dry_run,
                output_dir=args.output_dir,
                resume=resume
            )
        
        if result.get("success"):
            logger.info("✅ Process completed successfully")
            sys.exit(0)
        else:
            logger.error("❌ Process failed")
            sys.exit(1)
            
    except KeyboardInterrupt:
        logger.info("\n\n✅ Gracefully stopped. Progress has been saved.")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
