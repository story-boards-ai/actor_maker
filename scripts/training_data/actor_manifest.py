"""
Actor manifest loader - Loads actor metadata from manifest files.
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


class ActorManifest:
    """Loads and provides access to actor manifest data."""
    
    MANIFEST_DIR = Path("data/actor_manifests")
    
    def __init__(self, actor_id: str, data: Dict[str, Any]):
        """
        Initialize actor manifest.
        
        Args:
            actor_id: Actor ID
            data: Manifest data dictionary
        """
        self.actor_id = actor_id
        self.data = data
        self.metadata = data.get("metadata", {})
    
    @classmethod
    def load(cls, actor_id: str) -> Optional['ActorManifest']:
        """
        Load actor manifest from file.
        
        Args:
            actor_id: Actor ID
            
        Returns:
            ActorManifest instance or None if not found
        """
        manifest_file = cls.MANIFEST_DIR / f"{actor_id}_manifest.json"
        
        if not manifest_file.exists():
            logger.error(f"Manifest not found: {manifest_file}")
            return None
        
        try:
            data = json.loads(manifest_file.read_text())
            logger.debug(f"Loaded manifest for {actor_id}")
            return cls(actor_id, data)
        except Exception as e:
            logger.error(f"Failed to load manifest {manifest_file}: {e}")
            return None
    
    @classmethod
    def list_all(cls) -> List[str]:
        """
        List all actor IDs with manifests.
        
        Returns:
            List of actor IDs
        """
        if not cls.MANIFEST_DIR.exists():
            return []
        
        actor_ids = []
        for manifest_file in cls.MANIFEST_DIR.glob("*_manifest.json"):
            # Extract actor ID from filename
            actor_id = manifest_file.stem.replace("_manifest", "")
            actor_ids.append(actor_id)
        
        return sorted(actor_ids)
    
    def get_base_image_path(self) -> Optional[str]:
        """
        Get path to base image.
        
        Returns:
            Path to base image or None if not found
        """
        base_images = self.data.get("base_images", [])
        
        if not base_images:
            logger.warning(f"No base images found for {self.actor_id}")
            return None
        
        # Get first base image
        base_image = base_images[0]
        
        # Try moved_to path first, then original path
        path = base_image.get("moved_to") or base_image.get("path")
        
        if path and Path(path).exists():
            return path
        
        # Try relative path
        rel_path = base_image.get("moved_relative_path") or base_image.get("relative_path")
        if rel_path:
            full_path = Path(rel_path)
            if full_path.exists():
                return str(full_path)
        
        logger.warning(f"Base image not found for {self.actor_id}")
        return None
    
    def get_scene_images(self) -> List[Dict[str, Any]]:
        """
        Get all scene images.
        
        Returns:
            List of scene image dictionaries
        """
        return self.data.get("scene_images", [])
    
    def get_character_name(self) -> str:
        """Get character name."""
        return self.data.get("character_name", self.actor_id)
    
    def get_age(self) -> Optional[str]:
        """Get actor age."""
        return self.metadata.get("age")
    
    def get_sex(self) -> Optional[str]:
        """Get actor sex."""
        return self.metadata.get("sex")
    
    def get_ethnicity(self) -> Optional[str]:
        """Get actor ethnicity."""
        return self.metadata.get("ethnicity")
    
    def get_face_prompt(self) -> Optional[str]:
        """Get face prompt description."""
        return self.metadata.get("face_prompt")
