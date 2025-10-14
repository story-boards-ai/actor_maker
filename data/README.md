# Styles Data Directory

This directory contains the styles registry and related data files.

## Files

### `styles_registry.json`
The main styles registry tracking:
- Style metadata (ID, title, LoRA name, weights)
- Training data locations and counts
- LoRA file information
- Sync status with backend

**Structure**:
```json
{
  "version": "1.0.0",
  "last_synced": "2025-01-10T11:16:00Z",
  "styles": [
    {
      "id": "1",
      "title": "Ink Intensity",
      "lora_name": "SBai_style_1",
      "training_data": {
        "training_images_count": 50,
        "s3_prefix": "styles/style_1/"
      }
    }
  ],
  "loras": []
}
```

## Usage

### Initialize Registry
```bash
# Create sample registry with production styles
python scripts/sync_styles_from_backend.py --create-sample

# Or sync from backend JSON
python scripts/sync_styles_from_backend.py --backend-json /path/to/styles.json
```

### Access in Python
```python
from src.styles import load_registry, get_style

# Load registry
registry = load_registry()

# Get all styles
styles = registry.get_all_styles()

# Get specific style
style = registry.get_style_by_id("1")
```

## Maintenance

- Keep registry in sync with backend
- Update training data counts after uploading to S3
- Mark styles as trained after completing training
- Version LoRA files appropriately

See `scripts/sync_styles_from_backend.py` for sync utilities.
