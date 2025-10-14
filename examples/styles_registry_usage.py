"""
Example usage of the styles registry.
"""
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.styles import StylesRegistry, load_registry, get_style


def example_load_registry():
    """Example: Load and inspect the registry."""
    print("\n=== Example 1: Load Registry ===")
    
    registry = load_registry()
    
    all_styles = registry.get_all_styles()
    print(f"Total styles in registry: {len(all_styles)}")
    
    for style in all_styles[:3]:  # Show first 3
        print(f"  - {style['id']}: {style['title']} (LoRA: {style['lora_name']})")


def example_get_style():
    """Example: Get specific style by ID."""
    print("\n=== Example 2: Get Style by ID ===")
    
    style = get_style("1")
    if style:
        print(f"Style ID: {style['id']}")
        print(f"Title: {style['title']}")
        print(f"LoRA: {style['lora_name']}")
        print(f"Model: {style['model']}")
        print(f"Monochrome: {style['monochrome']}")
        print(f"Training data count: {style['training_data']['training_images_count']}")


def example_update_training_data():
    """Example: Update training data for a style."""
    print("\n=== Example 3: Update Training Data ===")
    
    registry = load_registry()
    
    # Update training data info
    registry.update_training_data(
        style_id="1",
        source_images_count=5,
        training_images_count=50,
        s3_bucket="storyboard-user-files",
        s3_prefix="styles/style_1/training/"
    )
    
    # Save changes
    registry.save()
    print("✅ Updated training data for style 1")
    
    # Verify
    style = registry.get_style_by_id("1")
    print(f"Training images: {style['training_data']['training_images_count']}")


def example_mark_trained():
    """Example: Mark a style as trained."""
    print("\n=== Example 4: Mark Style as Trained ===")
    
    registry = load_registry()
    
    # Mark as trained with new version
    registry.mark_trained("1", lora_version="1.1")
    
    # Update LoRA file info
    registry.update_lora_file(
        lora_name="SBai_style_1",
        lora_file="SBai_style_1_v1.1.safetensors",
        s3_url="https://s3.amazonaws.com/bucket/loras/SBai_style_1_v1.1.safetensors",
        local_path="/path/to/loras/SBai_style_1_v1.1.safetensors",
        file_size_mb=143.5,
        version="1.1"
    )
    
    registry.save()
    print("✅ Marked style 1 as trained (version 1.1)")


def example_find_styles_needing_training():
    """Example: Find styles that need training."""
    print("\n=== Example 5: Find Styles Needing Training ===")
    
    registry = load_registry()
    
    styles_to_train = registry.get_styles_needing_training()
    
    if styles_to_train:
        print(f"Found {len(styles_to_train)} styles needing training:")
        for style in styles_to_train:
            print(f"  - {style['id']}: {style['title']}")
            print(f"    Training images: {style['training_data']['training_images_count']}")
    else:
        print("No styles need training")


def example_add_new_style():
    """Example: Add a new custom style."""
    print("\n=== Example 6: Add New Custom Style ===")
    
    registry = load_registry()
    
    new_style = {
        "id": "custom_001",
        "client_index": 999,
        "title": "My Custom Style",
        "lora_name": "custom_style_001",
        "lora_file": "custom_style_001.safetensors",
        "lora_version": "1.0",
        "lora_weight": 1.0,
        "character_lora_weight": 0.9,
        "cine_lora_weight": 0.8,
        "trigger_words": "style custom_001",
        "monochrome": False,
        "model": "flux1-dev-fp8",
        "image_url": "",
        "training_data": {
            "source_images_count": 10,
            "training_images_count": 100,
            "s3_bucket": "storyboard-user-files",
            "s3_prefix": "styles/custom_001/",
            "last_trained": None
        },
        "metadata": {
            "status": "training",
            "notes": "Custom style for client XYZ"
        }
    }
    
    registry.add_style(new_style)
    registry.save()
    
    print(f"✅ Added new style: {new_style['title']}")


def example_workflow():
    """Example: Complete workflow for style training."""
    print("\n=== Example 7: Complete Training Workflow ===")
    
    registry = load_registry()
    style_id = "1"
    
    # 1. Get the style
    style = registry.get_style_by_id(style_id)
    print(f"1. Working with: {style['title']}")
    
    # 2. Update with training data count
    print("2. Uploading training images to S3...")
    # (This would be actual S3 upload)
    registry.update_training_data(
        style_id=style_id,
        training_images_count=75
    )
    
    # 3. Check if needs training
    print("3. Checking training status...")
    needs_training = registry.get_styles_needing_training()
    if any(s['id'] == style_id for s in needs_training):
        print("   → Style needs training")
    
    # 4. Train the model
    print("4. Training model...")
    # (This would be actual training)
    
    # 5. Mark as trained
    print("5. Marking as trained...")
    registry.mark_trained(style_id, lora_version="1.1")
    
    # 6. Update LoRA file info
    print("6. Updating LoRA file info...")
    registry.update_lora_file(
        lora_name=style['lora_name'],
        lora_file=f"{style['lora_name']}_v1.1.safetensors",
        s3_url=f"https://s3.amazonaws.com/loras/{style['lora_name']}_v1.1.safetensors",
        version="1.1"
    )
    
    # 7. Save
    registry.save()
    print("✅ Workflow complete!")


if __name__ == "__main__":
    print("Styles Registry Usage Examples")
    print("=" * 50)
    
    # Check if registry exists
    from pathlib import Path
    registry_path = Path(__file__).parent.parent / "data" / "styles_registry.json"
    
    if not registry_path.exists():
        print("\n⚠️  Registry not found!")
        print("Run this first:")
        print("  python scripts/sync_styles_from_backend.py --create-sample")
        sys.exit(1)
    
    # Run examples
    example_load_registry()
    example_get_style()
    example_update_training_data()
    example_mark_trained()
    example_find_styles_needing_training()
    # example_add_new_style()  # Commented - only run if you want to add
    example_workflow()
    
    print("\n✅ All examples completed")
