"""
Styles registry management.

Manages the local styles registry which tracks:
- Style metadata
- LoRA files and versions
- Training data locations
- Sync status with backend
"""
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class StylesRegistry:
    """
    Manages the styles registry for training and LoRA file management.
    """
    
    def __init__(self, registry_path: Optional[str] = None):
        """
        Initialize the styles registry.
        
        Args:
            registry_path: Path to registry JSON file (default: data/styles_registry.json)
        """
        if registry_path is None:
            # Default to project root/data/styles_registry.json
            project_root = Path(__file__).parent.parent.parent
            registry_path = project_root / "data" / "styles_registry.json"
        
        self.registry_path = Path(registry_path)
        self.data = self._load_registry()
    
    def _load_registry(self) -> Dict[str, Any]:
        """Load registry from JSON file."""
        if not self.registry_path.exists():
            logger.warning(f"Registry file not found: {self.registry_path}")
            return self._create_empty_registry()
        
        try:
            with open(self.registry_path, 'r') as f:
                data = json.load(f)
            logger.info(f"Loaded registry with {len(data.get('styles', []))} styles")
            return data
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse registry JSON: {e}")
            return self._create_empty_registry()
    
    def _create_empty_registry(self) -> Dict[str, Any]:
        """Create empty registry structure."""
        return {
            "version": "1.0.0",
            "last_synced": datetime.utcnow().isoformat() + "Z",
            "styles": [],
            "loras": []
        }
    
    def save(self) -> None:
        """Save registry to JSON file."""
        self.registry_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(self.registry_path, 'w') as f:
            json.dump(self.data, f, indent=2)
        
        logger.info(f"Saved registry to {self.registry_path}")
    
    def get_all_styles(self) -> List[Dict[str, Any]]:
        """Get all styles from registry."""
        return self.data.get("styles", [])
    
    def get_style_by_id(self, style_id: str) -> Optional[Dict[str, Any]]:
        """
        Get style by ID.
        
        Args:
            style_id: Style ID
        
        Returns:
            Style dict or None if not found
        """
        for style in self.data.get("styles", []):
            if style.get("id") == style_id:
                return style
        return None
    
    def get_style_by_lora_name(self, lora_name: str) -> Optional[Dict[str, Any]]:
        """
        Get style by LoRA name.
        
        Args:
            lora_name: LoRA name (e.g., "SBai_style_1")
        
        Returns:
            Style dict or None
        """
        for style in self.data.get("styles", []):
            if style.get("lora_name") == lora_name:
                return style
        return None
    
    def add_style(self, style: Dict[str, Any]) -> None:
        """
        Add a new style to registry.
        
        Args:
            style: Style dict with required fields
        """
        if "styles" not in self.data:
            self.data["styles"] = []
        
        # Check if style already exists
        existing = self.get_style_by_id(style.get("id"))
        if existing:
            logger.warning(f"Style {style.get('id')} already exists, use update_style instead")
            return
        
        # Set metadata timestamps
        if "metadata" not in style:
            style["metadata"] = {}
        
        now = datetime.utcnow().isoformat() + "Z"
        style["metadata"]["created_at"] = now
        style["metadata"]["updated_at"] = now
        
        self.data["styles"].append(style)
        logger.info(f"Added style: {style.get('id')} - {style.get('title')}")
    
    def update_style(self, style_id: str, updates: Dict[str, Any]) -> None:
        """
        Update an existing style.
        
        Args:
            style_id: Style ID to update
            updates: Dict of fields to update
        """
        style = self.get_style_by_id(style_id)
        if not style:
            logger.error(f"Style {style_id} not found")
            return
        
        # Update fields
        style.update(updates)
        
        # Update timestamp
        if "metadata" not in style:
            style["metadata"] = {}
        style["metadata"]["updated_at"] = datetime.utcnow().isoformat() + "Z"
        
        logger.info(f"Updated style: {style_id}")
    
    def update_training_data(
        self,
        style_id: str,
        source_images_count: Optional[int] = None,
        training_images_count: Optional[int] = None,
        s3_bucket: Optional[str] = None,
        s3_prefix: Optional[str] = None
    ) -> None:
        """
        Update training data information for a style.
        
        Args:
            style_id: Style ID
            source_images_count: Number of source images
            training_images_count: Number of training images
            s3_bucket: S3 bucket name
            s3_prefix: S3 key prefix
        """
        style = self.get_style_by_id(style_id)
        if not style:
            logger.error(f"Style {style_id} not found")
            return
        
        if "training_data" not in style:
            style["training_data"] = {}
        
        if source_images_count is not None:
            style["training_data"]["source_images_count"] = source_images_count
        if training_images_count is not None:
            style["training_data"]["training_images_count"] = training_images_count
        if s3_bucket:
            style["training_data"]["s3_bucket"] = s3_bucket
        if s3_prefix:
            style["training_data"]["s3_prefix"] = s3_prefix
        
        # Update timestamp
        style["metadata"]["updated_at"] = datetime.utcnow().isoformat() + "Z"
        
        logger.info(f"Updated training data for style: {style_id}")
    
    def mark_trained(self, style_id: str, lora_version: Optional[str] = None) -> None:
        """
        Mark a style as trained with new LoRA.
        
        Args:
            style_id: Style ID
            lora_version: New LoRA version string
        """
        style = self.get_style_by_id(style_id)
        if not style:
            logger.error(f"Style {style_id} not found")
            return
        
        now = datetime.utcnow().isoformat() + "Z"
        
        if "training_data" not in style:
            style["training_data"] = {}
        style["training_data"]["last_trained"] = now
        
        if lora_version:
            style["lora_version"] = lora_version
        
        style["metadata"]["updated_at"] = now
        
        logger.info(f"Marked style {style_id} as trained (version: {lora_version})")
    
    def get_lora_info(self, lora_name: str) -> Optional[Dict[str, Any]]:
        """
        Get LoRA information.
        
        Args:
            lora_name: LoRA name
        
        Returns:
            LoRA dict or None
        """
        for lora in self.data.get("loras", []):
            if lora.get("lora_name") == lora_name:
                return lora
        return None
    
    def update_lora_file(
        self,
        lora_name: str,
        lora_file: str,
        s3_url: Optional[str] = None,
        local_path: Optional[str] = None,
        file_size_mb: Optional[float] = None,
        version: Optional[str] = None
    ) -> None:
        """
        Update LoRA file information.
        
        Args:
            lora_name: LoRA name
            lora_file: LoRA filename
            s3_url: S3 URL of LoRA file
            local_path: Local path to LoRA file
            file_size_mb: File size in MB
            version: Version string
        """
        lora = self.get_lora_info(lora_name)
        
        if not lora:
            # Create new lora entry
            if "loras" not in self.data:
                self.data["loras"] = []
            
            lora = {
                "lora_name": lora_name,
                "lora_file": lora_file,
                "trigger_words": f"style {lora_name}",
                "version": version or "1.0",
                "file_size_mb": file_size_mb or 0,
                "s3_url": s3_url or "",
                "local_path": local_path or "",
                "trained_on": datetime.utcnow().isoformat() + "Z"
            }
            self.data["loras"].append(lora)
        else:
            # Update existing
            if s3_url:
                lora["s3_url"] = s3_url
            if local_path:
                lora["local_path"] = local_path
            if file_size_mb is not None:
                lora["file_size_mb"] = file_size_mb
            if version:
                lora["version"] = version
            lora["trained_on"] = datetime.utcnow().isoformat() + "Z"
        
        logger.info(f"Updated LoRA: {lora_name}")
    
    def get_styles_needing_training(self) -> List[Dict[str, Any]]:
        """
        Get styles that have training data but haven't been trained recently.
        
        Returns:
            List of style dicts
        """
        styles_needing_training = []
        
        for style in self.data.get("styles", []):
            training_data = style.get("training_data", {})
            training_count = training_data.get("training_images_count", 0)
            last_trained = training_data.get("last_trained")
            
            # Has training data but never trained, or needs retraining
            if training_count > 0 and not last_trained:
                styles_needing_training.append(style)
        
        return styles_needing_training
    
    def export_for_backend(self) -> Dict[str, Any]:
        """
        Export registry data in format compatible with backend.
        
        Returns:
            Dict suitable for backend consumption
        """
        # This would transform the registry format to match backend's StylesRepository structure
        return {
            "styles": self.data.get("styles", []),
            "loras": self.data.get("loras", []),
            "version": self.data.get("version"),
            "exported_at": datetime.utcnow().isoformat() + "Z"
        }


# Convenience functions

def load_registry(registry_path: Optional[str] = None) -> StylesRegistry:
    """
    Load the styles registry.
    
    Args:
        registry_path: Optional path to registry file
    
    Returns:
        StylesRegistry instance
    """
    return StylesRegistry(registry_path)


def get_style(style_id: str, registry_path: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Get a style by ID.
    
    Args:
        style_id: Style ID
        registry_path: Optional path to registry file
    
    Returns:
        Style dict or None
    """
    registry = load_registry(registry_path)
    return registry.get_style_by_id(style_id)
