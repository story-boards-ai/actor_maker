#!/usr/bin/env python3
"""
Create action plans for all actors with training data.
Evaluates each actor and saves a detailed action plan for later execution.

The action plans include:
- Which specific files to delete (with full paths)
- How many images to generate (by type)
- Current vs target distribution
- GPT's analysis and recommendations

Usage:
    python scripts/training_data/create_action_plans.py
"""

import sys
import json
import logging
from pathlib import Path
from datetime import datetime

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
    pass

from training_data_manifest import TrainingDataManifest
from training_data_evaluator import TrainingDataEvaluator
from progress_tracker import ProgressTracker

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def create_action_plan_for_actor(actor_id: str, evaluator: TrainingDataEvaluator, output_dir: Path) -> dict:
    """
    Create detailed action plan for a single actor.
    
    Args:
        actor_id: Actor ID
        evaluator: TrainingDataEvaluator instance
        output_dir: Directory to save action plans
        
    Returns:
        Summary dict
    """
    logger.info(f"Creating action plan for {actor_id}")
    
    try:
        # Run evaluation
        evaluation = evaluator.evaluate_actor(actor_id)
        
        if not evaluation:
            logger.warning(f"Failed to evaluate {actor_id}")
            return {"success": False, "actor_id": actor_id, "error": "Evaluation failed"}
        
        # Load manifest to get file paths
        manifest = TrainingDataManifest.load_actor_manifest(actor_id)
        images = manifest.get_all_images()
        images_list = list(images.values())
        
        # Build detailed action plan
        action_plan = {
            "actor_id": actor_id,
            "created_at": datetime.now().isoformat(),
            "status": "pending",
            
            # Current state
            "current_state": {
                "total_images": evaluation.get("total_images", len(images_list)),
                "distribution": {
                    "photorealistic": evaluation.get("photorealistic_count", 0),
                    "bw_stylized": evaluation.get("bw_stylized_count", 0),
                    "color_stylized": evaluation.get("color_stylized_count", 0)
                },
                "percentages": {
                    "photorealistic": evaluation.get("photorealistic_percentage", 0),
                    "bw_stylized": evaluation.get("bw_stylized_percentage", 0),
                    "color_stylized": evaluation.get("color_stylized_percentage", 0)
                }
            },
            
            # Target state
            "target_state": {
                "total_images": 20,
                "distribution": {
                    "photorealistic": 13,
                    "bw_stylized": 4,
                    "color_stylized": 3
                }
            },
            
            # Is balanced
            "is_balanced": evaluation["is_balanced"],
            
            # Files to delete (with full paths)
            "files_to_delete": [],
            
            # Images to generate
            "images_to_generate": evaluation["images_to_generate"],
            
            # GPT analysis
            "gpt_analysis": evaluation["gpt_analysis"],
            
            # Image classifications (for reference)
            "image_classifications": evaluation["image_classifications"]
        }
        
        # Add file paths for deletion
        for delete_item in evaluation["images_to_delete"]:
            image_number = delete_item["image_number"]
            image_type = delete_item["type"]
            
            # Find the corresponding image (1-indexed to 0-indexed)
            if image_number <= len(images_list):
                img_data = images_list[image_number - 1]
                action_plan["files_to_delete"].append({
                    "image_number": image_number,
                    "type": image_type,
                    "filename": img_data["filename"],
                    "local_path": img_data["local_path"],
                    "s3_url": img_data.get("s3_url", ""),
                    "quality_score": next(
                        (c["quality_score"] for c in evaluation["image_classifications"] 
                         if c["image_number"] == image_number),
                        0
                    )
                })
        
        # Save action plan
        plan_file = output_dir / f"{actor_id}_action_plan.json"
        plan_file.write_text(json.dumps(action_plan, indent=2))
        logger.info(f"✅ Saved action plan: {plan_file}")
        
        return {
            "success": True,
            "actor_id": actor_id,
            "is_balanced": action_plan["is_balanced"],
            "files_to_delete": len(action_plan["files_to_delete"]),
            "images_to_generate": sum(item["count"] for item in action_plan["images_to_generate"])
        }
        
    except Exception as e:
        logger.error(f"Failed to create action plan for {actor_id}: {e}")
        return {"success": False, "actor_id": actor_id, "error": str(e)}


def create_all_action_plans(output_dir: str = "data/action_plans", resume: bool = True):
    """
    Create action plans for all actors with training data.
    
    Args:
        output_dir: Directory to save action plans
        resume: Whether to resume from previous progress
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    logger.info("="*70)
    logger.info("CREATING ACTION PLANS FOR ALL ACTORS")
    logger.info("="*70)
    logger.info(f"Output directory: {output_path}")
    logger.info("")
    
    # Initialize progress tracker
    tracker = ProgressTracker(progress_file=f"{output_dir}/progress.json")
    
    # Get all actors
    all_actor_ids = TrainingDataManifest.list_all_actors()
    
    if not all_actor_ids:
        logger.error("No actors found with training data")
        return
    
    # Check if we can resume
    if resume and tracker.can_resume():
        logger.info("RESUMING FROM PREVIOUS PROGRESS")
        tracker.print_summary()
        actor_ids = tracker.get_remaining_actors(all_actor_ids)
        logger.info(f"Resuming with {len(actor_ids)} remaining actors\n")
    else:
        if not resume:
            logger.info("Starting fresh (no resume)")
            tracker.reset()
        actor_ids = all_actor_ids
        tracker.start(len(actor_ids))
        logger.info(f"Found {len(actor_ids)} actors with training data\n")
    
    # Initialize evaluator
    evaluator = TrainingDataEvaluator(output_dir="debug/action_plan_evaluation")
    
    # Process each actor
    results = []
    balanced_count = 0
    needs_action_count = 0
    
    try:
        for idx, actor_id in enumerate(actor_ids, 1):
            tracker.mark_processing(actor_id)
            
            logger.info(f"\n{'='*70}")
            logger.info(f"Processing {idx}/{len(actor_ids)}: {actor_id}")
            logger.info(f"Overall progress: {tracker.get_progress_percentage():.1f}%")
            logger.info(f"{'='*70}")
            
            try:
                result = create_action_plan_for_actor(actor_id, evaluator, output_path)
                results.append(result)
                
                if result.get("success"):
                    if result.get("is_balanced"):
                        balanced_count += 1
                    else:
                        needs_action_count += 1
                    
                    tracker.mark_completed(actor_id, result)
                else:
                    tracker.mark_failed(actor_id, result.get("error", "Unknown error"))
                
            except KeyboardInterrupt:
                logger.info("\n\n⚠️  Interrupted by user (Ctrl+C)")
                logger.info("Progress has been saved. Run again to continue.")
                tracker.print_summary()
                raise
                
            except Exception as e:
                logger.error(f"Failed to process {actor_id}: {e}")
                tracker.mark_failed(actor_id, str(e))
    
    except KeyboardInterrupt:
        raise
    
    # Final summary
    logger.info(f"\n{'='*70}")
    logger.info("FINAL SUMMARY")
    logger.info("="*70)
    logger.info(f"Processed: {len(results)} actors")
    logger.info(f"  Already balanced: {balanced_count}")
    logger.info(f"  Need action: {needs_action_count}")
    logger.info(f"")
    logger.info(f"Action plans saved to: {output_path}/")
    logger.info(f"  Format: {{actor_id}}_action_plan.json")
    logger.info("")
    
    tracker.print_summary()
    
    # Create summary file
    summary = {
        "created_at": datetime.now().isoformat(),
        "total_actors": len(results),
        "balanced": balanced_count,
        "needs_action": needs_action_count,
        "actors": results
    }
    
    summary_file = output_path / "summary.json"
    summary_file.write_text(json.dumps(summary, indent=2))
    logger.info(f"Summary saved to: {summary_file}")
    logger.info("")
    logger.info("="*70)
    logger.info("✅ ACTION PLAN CREATION COMPLETE")
    logger.info("="*70)


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Create action plans for all actors with training data"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="data/action_plans",
        help="Output directory for action plans"
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
    
    output_path = Path(args.output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Handle progress commands
    if args.show_progress:
        tracker = ProgressTracker(progress_file=f"{args.output_dir}/progress.json")
        tracker.print_summary()
        sys.exit(0)
    
    if args.reset_progress:
        tracker = ProgressTracker(progress_file=f"{args.output_dir}/progress.json")
        tracker.reset()
        logger.info("✅ Progress reset")
        sys.exit(0)
    
    try:
        create_all_action_plans(
            output_dir=args.output_dir,
            resume=not args.no_resume
        )
        sys.exit(0)
    except KeyboardInterrupt:
        logger.info("\n\n✅ Gracefully stopped. Progress has been saved.")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
