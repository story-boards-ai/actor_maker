"""
Centralized training data manifest manager.
Tracks all training data for actors across multiple generations.
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class TrainingDataManifest:
    """Manages the centralized training data manifest for an actor."""
    
    def __init__(self, actor_id: str, manifest_dir: str = "data/actors"):
        """
        Initialize manifest manager.
        
        Args:
            actor_id: Actor ID
            manifest_dir: Base directory for actor data
        """
        self.actor_id = actor_id
        self.manifest_dir = Path(manifest_dir)
        self.actor_dir = self.manifest_dir / actor_id / "training_data"
        self.manifest_file = self.actor_dir / "manifest.json"
        
        # Ensure directory exists
        self.actor_dir.mkdir(parents=True, exist_ok=True)
        
        # Load existing manifest
        self.manifest = self._load_manifest()
    
    def _load_manifest(self) -> Dict[str, Any]:
        """Load existing manifest or create new one."""
        if self.manifest_file.exists():
            try:
                data = json.loads(self.manifest_file.read_text())
                logger.info(f"Loaded existing manifest for actor {self.actor_id}: {len(data.get('images', {}))} images")
                return data
            except Exception as e:
                logger.error(f"Failed to load manifest: {e}")
                return self._create_new_manifest()
        else:
            logger.info(f"Creating new manifest for actor {self.actor_id}")
            return self._create_new_manifest()
    
    def _create_new_manifest(self) -> Dict[str, Any]:
        """Create a new empty manifest."""
        return {
            "actor_id": self.actor_id,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "total_images": 0,
            "generations": [],
            "images": {}
        }
    
    def add_generation(
        self,
        images: Dict[str, Any],
        generation_type: str = "replicate",
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Add a new generation of training data.
        
        Args:
            images: Dictionary of image metadata (filename -> metadata)
            generation_type: Type of generation ("replicate", "manual", "upload")
            metadata: Optional generation metadata
        """
        generation_id = len(self.manifest["generations"]) + 1
        
        generation_record = {
            "generation_id": generation_id,
            "type": generation_type,
            "generated_at": datetime.now().isoformat(),
            "image_count": len(images),
            "metadata": metadata or {}
        }
        
        # Add generation record
        self.manifest["generations"].append(generation_record)
        
        # Add images to manifest
        for filename, image_data in images.items():
            # Add generation info to image data
            image_data["generation_id"] = generation_id
            image_data["generation_type"] = generation_type
            
            # Store in manifest
            self.manifest["images"][filename] = image_data
        
        # Update totals
        self.manifest["total_images"] = len(self.manifest["images"])
        self.manifest["updated_at"] = datetime.now().isoformat()
        
        logger.info(f"Added generation {generation_id} with {len(images)} images")
        logger.info(f"Total images for actor {self.actor_id}: {self.manifest['total_images']}")
    
    def add_existing_images(
        self,
        images: List[Dict[str, Any]],
        source: str = "existing"
    ) -> None:
        """
        Add existing training data (e.g., from previous uploads).
        
        Args:
            images: List of image metadata dictionaries
            source: Source of the images
        """
        image_dict = {}
        
        for idx, image_data in enumerate(images, 1):
            # Generate filename if not provided
            filename = image_data.get("filename") or f"{self.actor_id}_existing_{idx:02d}.jpg"
            
            # Ensure required fields
            if "s3_url" not in image_data:
                logger.warning(f"Skipping image without s3_url: {filename}")
                continue
            
            image_dict[filename] = {
                "s3_url": image_data["s3_url"],
                "prompt": image_data.get("prompt", "Existing training data"),
                "prompt_preview": image_data.get("prompt_preview", "Existing training data"),
                "generated_at": image_data.get("generated_at", datetime.now().isoformat()),
                "index": len(self.manifest["images"]) + idx,
                "source": source
            }
        
        self.add_generation(image_dict, generation_type="existing", metadata={"source": source})
    
    def get_all_images(self) -> Dict[str, Any]:
        """Get all training images for this actor."""
        return self.manifest["images"]
    
    def get_image_urls(self) -> List[str]:
        """Get list of all S3 URLs."""
        return [img["s3_url"] for img in self.manifest["images"].values()]
    
    def get_generation_images(self, generation_id: int) -> Dict[str, Any]:
        """Get images from a specific generation."""
        return {
            filename: data
            for filename, data in self.manifest["images"].items()
            if data.get("generation_id") == generation_id
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """Get manifest statistics."""
        return {
            "actor_id": self.actor_id,
            "total_images": self.manifest["total_images"],
            "total_generations": len(self.manifest["generations"]),
            "created_at": self.manifest["created_at"],
            "updated_at": self.manifest["updated_at"],
            "generations": self.manifest["generations"]
        }
    
    def save(self) -> None:
        """Save manifest to disk."""
        try:
            self.manifest_file.write_text(json.dumps(self.manifest, indent=2))
            logger.info(f"Saved manifest for actor {self.actor_id}: {self.manifest_file}")
        except Exception as e:
            logger.error(f"Failed to save manifest: {e}")
            raise
    
    def export_for_training(self, output_file: Optional[str] = None) -> Dict[str, Any]:
        """
        Export training data in format ready for LoRA training.
        
        Args:
            output_file: Optional file to save export
            
        Returns:
            Dictionary with training configuration
        """
        export_data = {
            "actor_id": self.actor_id,
            "total_images": self.manifest["total_images"],
            "image_urls": self.get_image_urls(),
            "images_with_prompts": [
                {
                    "url": data["s3_url"],
                    "prompt": data["prompt"],
                    "filename": filename
                }
                for filename, data in self.manifest["images"].items()
            ]
        }
        
        if output_file:
            Path(output_file).write_text(json.dumps(export_data, indent=2))
            logger.info(f"Exported training data to: {output_file}")
        
        return export_data
    
    @classmethod
    def load_actor_manifest(cls, actor_id: str, manifest_dir: str = "data/actors") -> 'TrainingDataManifest':
        """
        Load manifest for an actor.
        
        Args:
            actor_id: Actor ID
            manifest_dir: Base directory for actor data
            
        Returns:
            TrainingDataManifest instance
        """
        return cls(actor_id, manifest_dir)
    
    @classmethod
    def list_all_actors(cls, manifest_dir: str = "data/actors") -> List[str]:
        """
        List all actors with training data.
        
        Args:
            manifest_dir: Base directory for actor data
            
        Returns:
            List of actor IDs
        """
        base_dir = Path(manifest_dir)
        if not base_dir.exists():
            return []
        
        actors = []
        for actor_dir in base_dir.iterdir():
            if actor_dir.is_dir():
                manifest_file = actor_dir / "training_data" / "manifest.json"
                if manifest_file.exists():
                    actors.append(actor_dir.name)
        
        return sorted(actors)
