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
        """
        Get all training images for this actor.
        Returns images from filesystem (like UI does), not just manifest.
        """
        # Get images from filesystem (same as UI)
        images_dict = {}
        
        if self.actor_dir.exists():
            # Find all image files
            for img_file in self.actor_dir.iterdir():
                if (img_file.is_file() and 
                    img_file.suffix.lower() in ['.png', '.jpg', '.jpeg'] and
                    'response' not in img_file.name and
                    'request' not in img_file.name and
                    'metadata' not in img_file.name):
                    
                    filename = img_file.name
                    
                    # Try to get metadata from manifest if it exists
                    manifest_data = self.manifest["images"].get(filename, {})
                    
                    # Build image data
                    images_dict[filename] = {
                        "filename": filename,
                        "local_path": str(img_file),
                        "s3_url": manifest_data.get("s3_url", ""),
                        "prompt": manifest_data.get("prompt", ""),
                        "prompt_preview": manifest_data.get("prompt_preview", ""),
                        "generated_at": manifest_data.get("generated_at", ""),
                        "index": manifest_data.get("index", 0),
                        "generation_id": manifest_data.get("generation_id", 0),
                        "generation_type": manifest_data.get("generation_type", "unknown")
                    }
        
        return images_dict
    
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
        Uses actorsData.json and checks for actual image files, matching UI behavior.
        
        Args:
            manifest_dir: Base directory for actor data
            
        Returns:
            List of actor IDs (actor names)
        """
        import json
        
        # Read actorsData.json (same as UI does)
        actors_data_path = Path("data/actorsData.json")
        if not actors_data_path.exists():
            logger.warning("actorsData.json not found, falling back to directory scan")
            return cls._list_actors_from_directories(manifest_dir)
        
        try:
            actors_data = json.loads(actors_data_path.read_text())
        except Exception as e:
            logger.error(f"Failed to read actorsData.json: {e}")
            return cls._list_actors_from_directories(manifest_dir)
        
        # Check each actor for training images (same logic as UI)
        actors_with_training = []
        base_dir = Path(manifest_dir)
        
        for actor in actors_data:
            actor_name = actor.get("name")
            if not actor_name:
                continue
            
            training_data_dir = base_dir / actor_name / "training_data"
            
            if training_data_dir.exists():
                # Count image files (same as UI: png, jpg, jpeg, excluding metadata)
                try:
                    image_files = [
                        f for f in training_data_dir.iterdir()
                        if f.is_file() and 
                        f.suffix.lower() in ['.png', '.jpg', '.jpeg'] and
                        'response' not in f.name and
                        'request' not in f.name and
                        'metadata' not in f.name
                    ]
                    
                    if len(image_files) > 0:
                        actors_with_training.append(actor_name)
                        logger.debug(f"Found {len(image_files)} training images for {actor_name}")
                except Exception as e:
                    logger.error(f"Error checking training data for {actor_name}: {e}")
        
        logger.info(f"Found {len(actors_with_training)} actors with training data")
        return sorted(actors_with_training)
    
    @classmethod
    def _list_actors_from_directories(cls, manifest_dir: str) -> List[str]:
        """Fallback method to list actors by scanning directories."""
        base_dir = Path(manifest_dir)
        if not base_dir.exists():
            return []
        
        actors = []
        for actor_dir in base_dir.iterdir():
            if actor_dir.is_dir():
                training_data_dir = actor_dir / "training_data"
                if training_data_dir.exists():
                    # Check for image files
                    image_files = list(training_data_dir.glob("*.png")) + \
                                  list(training_data_dir.glob("*.jpg")) + \
                                  list(training_data_dir.glob("*.jpeg"))
                    if len(image_files) > 0:
                        actors.append(actor_dir.name)
        
        return sorted(actors)
