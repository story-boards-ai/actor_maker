#!/usr/bin/env python3
"""
Execute action plans to balance training data.

This script:
1. Reads action plans from data/action_plans/
2. Deletes images marked for deletion (local + S3)
3. Generates new images as specified
4. Updates manifests
5. Tracks execution progress

Usage:
    # Dry run (show what would happen)
    python scripts/training_data/execute_action_plans.py --dry-run
    
    # Execute for specific actor
    python scripts/training_data/execute_action_plans.py --actor-id 0019_european_20_female
    
    # Execute all action plans
    python scripts/training_data/execute_action_plans.py --all
    
    # Execute only deletions (no generation)
    python scripts/training_data/execute_action_plans.py --all --delete-only
    
    # Execute only generation (no deletions)
    python scripts/training_data/execute_action_plans.py --all --generate-only
"""

import sys
import json
import logging
import argparse
import asyncio
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List

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

# Setup logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

from training_data_manifest import TrainingDataManifest
from replicate_service import ReplicateService
from actor_training_prompts import get_actor_training_prompts, get_actor_descriptor

# Try to import S3 upload function (optional)
try:
    from utils.s3 import S3Client
    s3_available = True
except ImportError:
    logger.warning("S3 upload not available")
    s3_available = False
    S3Client = None

# Try to import S3Manager (optional)
try:
    from s3_manager import S3Manager
except ImportError:
    logger.warning("S3Manager not available - S3 operations will be skipped")
    S3Manager = None


class ActionPlanExecutor:
    """Execute action plans to balance training data."""
    
    # Maximum concurrent image generation requests
    MAX_CONCURRENT_REQUESTS = 2
    
    def __init__(self, dry_run: bool = True, user_id: str = "system"):
        """
        Initialize executor.
        
        Args:
            dry_run: If True, only show what would happen without making changes
            user_id: User ID for S3 uploads
        """
        self.dry_run = dry_run
        self.user_id = user_id
        self.s3_manager = S3Manager() if S3Manager else None
        
        # Initialize Replicate service
        try:
            self.replicate = ReplicateService()
            logger.info("✅ Replicate service initialized")
        except Exception as e:
            logger.warning(f"⚠️  Replicate service not available: {e}")
            self.replicate = None
        
        if dry_run:
            logger.info("🔍 DRY RUN MODE - No changes will be made")
        else:
            logger.warning("⚠️  EXECUTION MODE - Changes will be made!")
        
        logger.info(f"📊 Concurrency limit: {self.MAX_CONCURRENT_REQUESTS} concurrent image generation requests")
    
    def execute_action_plan(
        self,
        action_plan_file: Path,
        delete_only: bool = False,
        generate_only: bool = False
    ) -> Dict[str, Any]:
        """
        Execute a single action plan.
        
        Args:
            action_plan_file: Path to action plan JSON
            delete_only: Only perform deletions
            generate_only: Only perform generation
            
        Returns:
            Execution result summary
        """
        logger.info(f"{'='*70}")
        logger.info(f"Executing action plan: {action_plan_file.name}")
        logger.info(f"{'='*70}")
        
        try:
            # Load action plan
            action_plan = json.loads(action_plan_file.read_text())
            actor_id = action_plan["actor_id"]
            
            # Check if already balanced
            if action_plan.get("is_balanced", False):
                logger.info(f"✅ Actor {actor_id} is already balanced - skipping")
                return {
                    "success": True,
                    "actor_id": actor_id,
                    "skipped": True,
                    "reason": "already_balanced"
                }
            
            # Load manifest
            manifest = TrainingDataManifest.load_actor_manifest(actor_id)
            
            deleted_count = 0
            generated_count = 0
            
            # Execute deletions
            if not generate_only:
                deleted_count = self._execute_deletions(
                    actor_id,
                    action_plan["files_to_delete"],
                    manifest
                )
            
            # Execute generation
            if not delete_only:
                generated_count = self._execute_generation(
                    actor_id,
                    action_plan["images_to_generate"],
                    manifest
                )
            
            # Update action plan status
            if not self.dry_run:
                action_plan["status"] = "completed"
                action_plan["executed_at"] = datetime.now().isoformat()
                action_plan["execution_summary"] = {
                    "deleted": deleted_count,
                    "generated": generated_count
                }
                action_plan_file.write_text(json.dumps(action_plan, indent=2))
            
            logger.info(f"")
            logger.info(f"✅ Action plan executed successfully")
            logger.info(f"   Deleted: {deleted_count} images")
            logger.info(f"   Generated: {generated_count} images")
            
            return {
                "success": True,
                "actor_id": actor_id,
                "deleted": deleted_count,
                "generated": generated_count
            }
            
        except Exception as e:
            logger.error(f"Failed to execute action plan: {e}", exc_info=True)
            return {
                "success": False,
                "actor_id": action_plan.get("actor_id", "unknown"),
                "error": str(e)
            }
    
    def _execute_deletions(
        self,
        actor_id: str,
        files_to_delete: List[Dict[str, Any]],
        manifest: TrainingDataManifest
    ) -> int:
        """
        Execute file deletions.
        
        Args:
            actor_id: Actor ID
            files_to_delete: List of files to delete
            manifest: Training data manifest
            
        Returns:
            Number of files deleted
        """
        if not files_to_delete:
            logger.info("No files to delete")
            return 0
        
        logger.info(f"")
        logger.info(f"🗑️  DELETIONS ({len(files_to_delete)} files)")
        logger.info(f"{'='*70}")
        
        deleted_count = 0
        
        for file_info in files_to_delete:
            filename = file_info["filename"]
            local_path = Path(file_info["local_path"])
            s3_url = file_info.get("s3_url", "")
            quality_score = file_info.get("quality_score", 0)
            
            logger.info(f"")
            logger.info(f"Deleting: {filename}")
            logger.info(f"  Type: {file_info['type']}")
            logger.info(f"  Quality score: {quality_score}")
            logger.info(f"  Local: {local_path}")
            
            if self.dry_run:
                logger.info(f"  [DRY RUN] Would delete local file")
                if s3_url:
                    logger.info(f"  [DRY RUN] Would delete from S3: {s3_url}")
                logger.info(f"  [DRY RUN] Would remove from manifest")
            else:
                # Delete local file
                if local_path.exists():
                    local_path.unlink()
                    logger.info(f"  ✅ Deleted local file")
                else:
                    logger.warning(f"  ⚠️  Local file not found")
                
                # Delete from S3
                if s3_url:
                    if self.s3_manager:
                        try:
                            self.s3_manager.delete_file(s3_url)
                            logger.info(f"  ✅ Deleted from S3")
                        except Exception as e:
                            logger.warning(f"  ⚠️  Failed to delete from S3: {e}")
                    else:
                        logger.warning(f"  ⚠️  S3Manager not available - skipping S3 deletion")
                
                # Remove from manifest
                manifest.remove_image(filename)
                logger.info(f"  ✅ Removed from manifest")
            
            deleted_count += 1
        
        # Save manifest
        if not self.dry_run:
            manifest.save()
            logger.info(f"")
            logger.info(f"✅ Manifest saved")
        
        return deleted_count
    
    def _execute_generation(
        self,
        actor_id: str,
        images_to_generate: List[Dict[str, Any]],
        manifest: TrainingDataManifest
    ) -> int:
        """
        Execute image generation with concurrency control.
        
        Args:
            actor_id: Actor ID
            images_to_generate: List of generation specs
            manifest: Training data manifest
            
        Returns:
            Number of images generated
        """
        if not images_to_generate:
            logger.info("No images to generate")
            return 0
        
        total_to_generate = sum(item["count"] for item in images_to_generate)
        
        logger.info(f"")
        logger.info(f"🎨 GENERATION ({total_to_generate} images)")
        logger.info(f"{'='*70}")
        logger.info(f"Concurrency: Max {self.MAX_CONCURRENT_REQUESTS} requests at a time")
        
        # Build list of all individual generation tasks
        generation_tasks = []
        for gen_spec in images_to_generate:
            img_type = gen_spec["type"]
            count = gen_spec["count"]
            
            for i in range(count):
                generation_tasks.append({
                    "type": img_type,
                    "index": i + 1,
                    "total": count
                })
        
        if self.dry_run:
            # Dry run - just show what would happen
            for gen_spec in images_to_generate:
                img_type = gen_spec["type"]
                count = gen_spec["count"]
                
                logger.info(f"")
                logger.info(f"Generating {count} {img_type} images")
                logger.info(f"  [DRY RUN] Would generate {count} {img_type} images")
                logger.info(f"  [DRY RUN] Would process in batches of {self.MAX_CONCURRENT_REQUESTS}")
                logger.info(f"  [DRY RUN] Would upload to S3")
                logger.info(f"  [DRY RUN] Would add to manifest")
            
            return total_to_generate
        else:
            # Actual execution with concurrency control
            logger.info(f"")
            logger.info(f"Processing {len(generation_tasks)} images in batches of {self.MAX_CONCURRENT_REQUESTS}")
            
            # Prepare prompts ONCE for all batches
            prompt_state = self._prepare_prompts_for_actor(actor_id)
            
            generated_count = 0
            
            # Process in batches of MAX_CONCURRENT_REQUESTS
            for i in range(0, len(generation_tasks), self.MAX_CONCURRENT_REQUESTS):
                batch = generation_tasks[i:i + self.MAX_CONCURRENT_REQUESTS]
                batch_num = (i // self.MAX_CONCURRENT_REQUESTS) + 1
                total_batches = (len(generation_tasks) + self.MAX_CONCURRENT_REQUESTS - 1) // self.MAX_CONCURRENT_REQUESTS
                
                logger.info(f"")
                logger.info(f"📦 Batch {batch_num}/{total_batches} ({len(batch)} images)")
                
                for task in batch:
                    logger.info(f"  - {task['type']} image {task['index']}/{task['total']}")
                
                # Generate images in this batch
                if not self.replicate:
                    logger.error(f"  ❌ Replicate service not available - skipping generation")
                    continue
                
                try:
                    batch_results = self._generate_batch_images(actor_id, batch, manifest, prompt_state)
                    generated_count += len(batch_results)
                    logger.info(f"  ✅ Generated {len(batch_results)} images in this batch")
                except Exception as e:
                    logger.error(f"  ❌ Batch generation failed: {e}")
                    continue
            
            # Save manifest with new images
            if generated_count > 0:
                manifest.save()
                logger.info(f"")
                logger.info(f"✅ Manifest saved with {generated_count} new images")
            
            return generated_count
    
    def _prepare_prompts_for_actor(self, actor_id: str) -> Dict[str, Any]:
        """
        Prepare and shuffle prompts for an actor once.
        
        Args:
            actor_id: Actor ID
            
        Returns:
            Dict with prompts and tracking state
        """
        # Get actor metadata to determine descriptor
        try:
            actors_data_file = Path("data/actorsData.json")
            actors_data = json.loads(actors_data_file.read_text())
            actor_info = next((a for a in actors_data if a["name"] == actor_id), None)
            
            if actor_info:
                sex = actor_info.get("sex", "male")
                descriptor = get_actor_descriptor("human", sex)
            else:
                descriptor = "person"
        except Exception as e:
            logger.warning(f"Could not load actor metadata: {e}")
            descriptor = "person"
        
        logger.info(f"Using descriptor: {descriptor}")
        
        # Get all training prompts for this actor
        all_prompts = get_actor_training_prompts(descriptor)
        
        # Separate prompts by type
        photorealistic_prompts = all_prompts[:15].copy()
        bw_stylized_prompts = all_prompts[15:26].copy()
        color_stylized_prompts = all_prompts[26:35].copy()
        
        # Shuffle prompts for variety
        import random
        random.shuffle(photorealistic_prompts)
        random.shuffle(bw_stylized_prompts)
        random.shuffle(color_stylized_prompts)
        
        return {
            "photorealistic": photorealistic_prompts,
            "bw_stylized": bw_stylized_prompts,
            "color_stylized": color_stylized_prompts,
            "used_indices": {"photorealistic": 0, "bw_stylized": 0, "color_stylized": 0}
        }
    
    def _generate_batch_images(
        self,
        actor_id: str,
        batch: List[Dict[str, Any]],
        manifest: TrainingDataManifest,
        prompt_state: Dict[str, Any]
    ) -> List[str]:
        """
        Generate a batch of images concurrently.
        
        Args:
            actor_id: Actor ID
            batch: List of generation tasks
            manifest: Training data manifest
            
        Returns:
            List of generated image URLs
        """
        # Get actor's base image for reference
        actor_dir = Path(f"data/actors/{actor_id}")
        base_image_dir = actor_dir / "base_image"
        
        # Find base image
        base_image_path = None
        if base_image_dir.exists():
            for ext in ['.png', '.jpg', '.jpeg']:
                potential_path = base_image_dir / f"{actor_id}_base{ext}"
                if potential_path.exists():
                    base_image_path = potential_path
                    break
        
        if not base_image_path:
            logger.error(f"No base image found for actor {actor_id}")
            return []
        
        logger.info(f"Using base image: {base_image_path}")
        
        # Read local base image as base64
        import base64
        with open(base_image_path, 'rb') as f:
            image_bytes = f.read()
            source_image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        logger.info(f"Loaded base image ({len(source_image_base64)} chars base64)")
        
        # Get prompts from shared state
        photorealistic_prompts = prompt_state["photorealistic"]
        bw_stylized_prompts = prompt_state["bw_stylized"]
        color_stylized_prompts = prompt_state["color_stylized"]
        used_indices = prompt_state["used_indices"]
        
        generated_urls = []
        
        # Calculate starting index once for the batch
        training_data_dir = actor_dir / "training_data"
        training_data_dir.mkdir(parents=True, exist_ok=True)
        existing_images = list(training_data_dir.glob("*.jpg")) + list(training_data_dir.glob("*.png"))
        next_index = len(existing_images)
        
        # Generate each image in the batch
        for task in batch:
            img_type = task["type"]
            
            try:
                # Select next prompt for this type
                if img_type == "photorealistic":
                    prompt_list = photorealistic_prompts
                elif img_type == "bw_stylized":
                    prompt_list = bw_stylized_prompts
                else:  # color_stylized
                    prompt_list = color_stylized_prompts
                
                # Get next prompt (cycle if needed)
                prompt_index = used_indices[img_type] % len(prompt_list)
                prompt = prompt_list[prompt_index]
                used_indices[img_type] += 1
                
                logger.info(f"    Generating {img_type} image...")
                logger.info(f"    Prompt: {prompt[:100]}...")
                
                # Generate image with Replicate (using grid method for single image)
                image_url = self.replicate.generate_grid_with_flux_kontext(
                    prompt=prompt,
                    input_image_base64=source_image_base64,
                    aspect_ratio="1:1",
                    output_format="jpg"
                )
                
                # Generate filename with incrementing index
                filename = f"{actor_id}_{next_index}.jpg"
                local_path = training_data_dir / filename
                next_index += 1  # Increment for next image in batch
                
                # Download and save locally
                import requests
                response = requests.get(image_url)
                response.raise_for_status()
                local_path.write_bytes(response.content)
                
                logger.info(f"    ✅ Saved locally: {filename}")
                
                # Upload to S3 (optional)
                s3_url = ""
                if s3_available and S3Client:
                    try:
                        s3_client = S3Client()
                        with open(local_path, 'rb') as f:
                            result = s3_client.upload_image(
                                image_data=f,
                                bucket=os.getenv("AWS_BUCKET", "story-boards-assets"),
                                key=f"system_actors/training_data/{actor_id}/{filename}"
                            )
                        # Extract just the URL string
                        s3_url = result.get('Location', '') if isinstance(result, dict) else result
                        logger.info(f"    ✅ Uploaded to S3: {s3_url}")
                    except Exception as e:
                        logger.warning(f"    ⚠️  S3 upload failed: {e}")
                else:
                    logger.info(f"    ⚠️  S3 not available - skipping upload")
                
                # Add to manifest
                manifest.manifest["images"][filename] = {
                    "filename": filename,
                    "local_path": str(local_path),
                    "s3_url": s3_url,
                    "prompt": prompt,
                    "prompt_preview": prompt[:100],
                    "generated_at": datetime.now().isoformat(),
                    "index": next_index,
                    "generation_id": len(manifest.manifest["generations"]) + 1,
                    "generation_type": img_type
                }
                manifest.manifest["total_images"] = len(manifest.manifest["images"])
                manifest.manifest["updated_at"] = datetime.now().isoformat()
                
                generated_urls.append(image_url)
                logger.info(f"    ✅ Added to manifest")
                
            except Exception as e:
                logger.error(f"    ❌ Failed to generate {img_type} image: {e}")
                continue
        
        return generated_urls


def execute_all_action_plans(
    plans_dir: str = "data/action_plans",
    dry_run: bool = True,
    delete_only: bool = False,
    generate_only: bool = False
):
    """
    Execute all action plans.
    
    Args:
        plans_dir: Directory containing action plans
        dry_run: If True, only show what would happen
        delete_only: Only perform deletions
        generate_only: Only perform generation
    """
    plans_path = Path(plans_dir)
    
    if not plans_path.exists():
        logger.error(f"Action plans directory not found: {plans_path}")
        return
    
    # Find all action plan files
    plan_files = sorted(plans_path.glob("*_action_plan.json"))
    
    if not plan_files:
        logger.error(f"No action plan files found in {plans_path}")
        return
    
    logger.info("="*70)
    logger.info("EXECUTING ALL ACTION PLANS")
    logger.info("="*70)
    logger.info(f"Plans directory: {plans_path}")
    logger.info(f"Total plans: {len(plan_files)}")
    logger.info(f"Mode: {'DRY RUN' if dry_run else 'EXECUTION'}")
    if delete_only:
        logger.info(f"Operation: DELETE ONLY")
    elif generate_only:
        logger.info(f"Operation: GENERATE ONLY")
    logger.info("")
    
    # Initialize executor
    executor = ActionPlanExecutor(dry_run=dry_run)
    
    # Execute each plan
    results = []
    skipped = 0
    failed = 0
    
    for idx, plan_file in enumerate(plan_files, 1):
        logger.info(f"\n{'='*70}")
        logger.info(f"Progress: {idx}/{len(plan_files)}")
        logger.info(f"{'='*70}")
        
        result = executor.execute_action_plan(
            plan_file,
            delete_only=delete_only,
            generate_only=generate_only
        )
        results.append(result)
        
        if result.get("skipped"):
            skipped += 1
        elif not result.get("success"):
            failed += 1
    
    # Final summary
    logger.info(f"\n{'='*70}")
    logger.info("EXECUTION SUMMARY")
    logger.info("="*70)
    logger.info(f"Total plans: {len(plan_files)}")
    logger.info(f"Executed: {len(results) - skipped - failed}")
    logger.info(f"Skipped: {skipped} (already balanced)")
    logger.info(f"Failed: {failed}")
    logger.info("")
    
    if dry_run:
        logger.info("🔍 This was a DRY RUN - no changes were made")
        logger.info("Run with --execute to apply changes")
    else:
        logger.info("✅ Execution complete")
    
    logger.info("="*70)


def main():
    parser = argparse.ArgumentParser(
        description="Execute action plans to balance training data"
    )
    parser.add_argument(
        "--actor-id",
        type=str,
        help="Execute plan for specific actor"
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Execute all action plans"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=True,
        help="Dry run mode (default, show what would happen)"
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Execute mode (actually make changes)"
    )
    parser.add_argument(
        "--delete-only",
        action="store_true",
        help="Only perform deletions, skip generation"
    )
    parser.add_argument(
        "--generate-only",
        action="store_true",
        help="Only perform generation, skip deletions"
    )
    parser.add_argument(
        "--plans-dir",
        type=str,
        default="data/action_plans",
        help="Directory containing action plans"
    )
    
    args = parser.parse_args()
    
    # Determine dry_run mode
    dry_run = not args.execute
    
    if args.delete_only and args.generate_only:
        logger.error("Cannot use both --delete-only and --generate-only")
        sys.exit(1)
    
    if not args.actor_id and not args.all:
        logger.error("Must specify either --actor-id or --all")
        parser.print_help()
        sys.exit(1)
    
    try:
        if args.actor_id:
            # Execute single actor
            plan_file = Path(args.plans_dir) / f"{args.actor_id}_action_plan.json"
            if not plan_file.exists():
                logger.error(f"Action plan not found: {plan_file}")
                sys.exit(1)
            
            executor = ActionPlanExecutor(dry_run=dry_run)
            result = executor.execute_action_plan(
                plan_file,
                delete_only=args.delete_only,
                generate_only=args.generate_only
            )
            
            if result["success"]:
                sys.exit(0)
            else:
                sys.exit(1)
        else:
            # Execute all
            execute_all_action_plans(
                plans_dir=args.plans_dir,
                dry_run=dry_run,
                delete_only=args.delete_only,
                generate_only=args.generate_only
            )
            sys.exit(0)
            
    except KeyboardInterrupt:
        logger.info("\n\n⚠️  Interrupted by user (Ctrl+C)")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
