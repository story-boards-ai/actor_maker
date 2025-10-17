#!/usr/bin/env python3
"""
Migrate existing training data to manifest format.

Converts prompt_metadata.json files to the proper manifest.json format
expected by the training data automation system.
"""

import json
import logging
import sys
from pathlib import Path
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def migrate_actor_manifest(actor_dir: Path) -> bool:
    """
    Migrate a single actor's training data to manifest format.
    
    Args:
        actor_dir: Path to actor directory
        
    Returns:
        True if successful
    """
    actor_id = actor_dir.name
    training_data_dir = actor_dir / "training_data"
    
    if not training_data_dir.exists():
        logger.debug(f"No training_data directory for {actor_id}")
        return False
    
    # Check for existing manifest
    manifest_file = training_data_dir / "manifest.json"
    if manifest_file.exists():
        logger.debug(f"Manifest already exists for {actor_id}")
        return True
    
    # Check for prompt_metadata.json or response.json
    prompt_metadata_file = training_data_dir / "prompt_metadata.json"
    response_file = training_data_dir / "response.json"
    
    has_prompt_metadata = prompt_metadata_file.exists()
    has_response = response_file.exists()
    
    if not has_prompt_metadata and not has_response:
        logger.debug(f"No metadata files for {actor_id}")
        return False
    
    try:
        images_dict = {}
        source_type = ""
        
        # Try to load from prompt_metadata.json first
        if has_prompt_metadata:
            prompt_data = json.loads(prompt_metadata_file.read_text())
            images_dict = prompt_data.get("images", {})
            source_type = "prompt_metadata"
        
        # If no images from prompt_metadata, try response.json
        if not images_dict and has_response:
            response_data = json.loads(response_file.read_text())
            s3_urls = response_data.get("output", {}).get("output", {}).get("s3_image_urls", [])
            
            # Create images dict from S3 URLs
            for s3_url in s3_urls:
                filename = Path(s3_url).name
                images_dict[filename] = {
                    "s3_url": s3_url,
                    "prompt": "",  # No prompt available
                    "generated_at": datetime.now().isoformat()
                }
            source_type = "response"
        
        # Also check for orphaned images (files that exist but aren't in metadata)
        if training_data_dir.exists():
            existing_files = [
                f.name for f in training_data_dir.iterdir()
                if f.is_file() and 
                f.suffix.lower() in ['.png', '.jpg', '.jpeg'] and
                'response' not in f.name and
                'request' not in f.name and
                'metadata' not in f.name
            ]
            
            # Add any orphaned images to the dict
            for filename in existing_files:
                if filename not in images_dict:
                    logger.info(f"Found orphaned image: {filename}")
                    images_dict[filename] = {
                        "s3_url": "",  # Unknown S3 URL
                        "prompt": "",  # No prompt available
                        "generated_at": datetime.now().isoformat()
                    }
        
        if not images_dict:
            logger.warning(f"No images found for {actor_id}")
            return False
        
        # Create manifest structure
        manifest = {
            "actor_id": actor_id,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "total_images": len(images_dict),
            "generations": [
                {
                    "generation_id": 1,
                    "type": "existing",
                    "generated_at": datetime.now().isoformat(),
                    "image_count": len(images_dict),
                    "metadata": {
                        "source": f"migrated_from_{source_type}",
                        "original_file": f"{source_type}.json"
                    }
                }
            ],
            "images": {}
        }
        
        # Convert images
        for filename, img_data in images_dict.items():
            manifest["images"][filename] = {
                "prompt": img_data.get("prompt", ""),
                "prompt_preview": img_data.get("prompt_preview", ""),
                "generated_at": img_data.get("generated_at", datetime.now().isoformat()),
                "s3_url": img_data.get("s3_url", ""),
                "index": img_data.get("index", 0),
                "generation_id": 1,
                "generation_type": "existing"
            }
        
        # Save manifest
        manifest_file.write_text(json.dumps(manifest, indent=2))
        logger.info(f"✅ Migrated {actor_id}: {len(images_dict)} images")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to migrate {actor_id}: {e}")
        return False


def migrate_all_actors(actors_dir: str = "data/actors") -> dict:
    """
    Migrate all actors' training data to manifest format.
    Uses actorsData.json to get list of actors (same as UI).
    
    Args:
        actors_dir: Base directory for actors
        
    Returns:
        Dictionary with migration results
    """
    import json
    
    # Read actorsData.json (same as UI)
    actors_data_path = Path("data/actorsData.json")
    if not actors_data_path.exists():
        logger.error("actorsData.json not found")
        return {"success": False, "message": "actorsData.json not found"}
    
    try:
        actors_data = json.loads(actors_data_path.read_text())
        logger.info(f"Found {len(actors_data)} actors in actorsData.json")
    except Exception as e:
        logger.error(f"Failed to read actorsData.json: {e}")
        return {"success": False, "message": f"Failed to read actorsData.json: {e}"}
    
    base_dir = Path(actors_dir)
    migrated = 0
    skipped = 0
    failed = 0
    
    for actor in actors_data:
        actor_name = actor.get("name")
        if not actor_name:
            continue
        
        actor_dir = base_dir / actor_name
        if not actor_dir.exists():
            continue
        
        try:
            if migrate_actor_manifest(actor_dir):
                migrated += 1
            else:
                skipped += 1
        except Exception as e:
            logger.error(f"Error processing {actor_name}: {e}")
            failed += 1
    
    logger.info(f"\n{'='*60}")
    logger.info(f"MIGRATION COMPLETE")
    logger.info(f"{'='*60}")
    logger.info(f"Migrated: {migrated} actors")
    logger.info(f"Skipped:  {skipped} actors (no data or already migrated)")
    logger.info(f"Failed:   {failed} actors")
    logger.info(f"{'='*60}\n")
    
    return {
        "success": True,
        "migrated": migrated,
        "skipped": skipped,
        "failed": failed
    }


def main():
    logger.info("="*60)
    logger.info("TRAINING DATA MANIFEST MIGRATION")
    logger.info("="*60)
    logger.info("Converting prompt_metadata.json to manifest.json format\n")
    
    result = migrate_all_actors()
    
    if result.get("success"):
        logger.info("✅ Migration completed successfully")
        sys.exit(0)
    else:
        logger.error("❌ Migration failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
