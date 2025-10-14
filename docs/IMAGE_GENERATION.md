# Image Generation Documentation

## Overview

The actor_maker repo now includes Python-based image generation using RunPod serverless and FLUX workflows. This allows you to generate images with custom styles and automatically save them to the appropriate style's resources folder.

## Architecture

### Components

1. **WorkflowBuilder** (`src/workflows_lib/workflow_builder.py`)
   - Loads and parameterizes ComfyUI workflows from JSON templates
   - Builds dynamic LoRA stacks with up to 10 LoRA slots
   - Handles style LoRAs, character LoRAs, and cinematic LoRAs
   - Applies automatic strength multipliers based on number of LoRAs

2. **ImageGenerator** (`src/utils/image_generator.py`)
   - Main interface for image generation
   - Integrates with RunPod serverless (RUNPOD_SERVER_100_ID)
   - Loads style configurations from styles registry
   - Automatically saves images to style-specific folders
   - Supports batch generation

3. **RunPodServerlessClient** (`src/runpod/serverless.py`)
   - Handles communication with RunPod API
   - Intelligent polling for job completion
   - Supports multiple response formats
   - Automatic retry and error handling

## Setup

### Environment Variables

Add these to your `.env` file:

```bash
# Required
RUNPOD_API_KEY=your_runpod_api_key_here
RUNPOD_SERVER_100_ID=your_endpoint_id_100

# Optional
RUNPOD_SERVER_150_ID=your_endpoint_id_150
RUNPOD_SERVER_SCHNELL_ID=your_schnell_endpoint_id
```

### Workflow Template

The V4 workflow template is located at: `workflows/normal_image_v4_workflow.json`

This includes:
- FLUX Dev model with fp8 quantization
- Dynamic LoRA stack (up to 10 LoRAs)
- TeaCache optimization
- Full parameter documentation

## Usage

### Quick Start

```python
from src.utils.image_generator import generate_image_with_style

# Generate with a style
result = generate_image_with_style(
    prompt="A detective in the rain, noir atmosphere",
    style_id="1",  # Ink Intensity
    steps=20,
    width=1360,
    height=768
)

if result:
    print(f"Image saved to: {result['saved_path']}")
    print(f"Seed: {result['seed']}")
```

### Advanced Usage

```python
from src.utils.image_generator import ImageGenerator

# Initialize generator
generator = ImageGenerator()

# Generate with custom settings
result = generator.generate_image(
    prompt="A cyberpunk cityscape at night",
    style_id="16",  # Dynamic Simplicity
    width=1360,
    height=768,
    steps=25,
    seed=12345,  # Fixed seed for reproducibility
    character_loras=["actor_uuid_1", "actor_uuid_2"],  # Add character LoRAs
    save_to_style=True,
    filename="cyberpunk_night.png"  # Custom filename
)
```

### Batch Generation

```python
from src.utils.image_generator import ImageGenerator

generator = ImageGenerator()

prompts = [
    "A lone figure in fog",
    "Hands holding a gun, dramatic",
    "Silhouette against window"
]

results = generator.generate_batch(
    prompts=prompts,
    style_id="1",
    steps=15,
    width=1360,
    height=768
)

# Check results
successful = [r for r in results if r is not None]
print(f"Generated {len(successful)}/{len(prompts)} images")
```

### List Available Styles

```python
from src.styles.styles_registry import StylesRegistry

registry = StylesRegistry()
styles = registry.get_all_styles()

for style in styles:
    print(f"ID: {style['id']} - {style['title']}")
    print(f"  LoRA: {style['lora_name']}")
    print(f"  Model: {style['model']}")
```

## Image Saving

Images are automatically saved to:
```
resources/style_images/{style_id}_{style_title}/generated_{timestamp}_{request_id}.png
```

For example, style "1" (Ink Intensity) saves to:
```
resources/style_images/1_ink_intensity/generated_20251011_142035_a1b2c3d4.png
```

## Parameters Reference

### ImageGenerator.generate_image()

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `prompt` | str | Required | Text prompt for generation |
| `style_id` | str | None | Style ID from registry |
| `width` | int | 1360 | Image width |
| `height` | int | 768 | Image height |
| `steps` | int | 20 | Sampling steps (more = better quality) |
| `seed` | int | -1 | Random seed (-1 for random) |
| `character_loras` | List[str] | None | Character LoRA IDs |
| `save_to_style` | bool | True | Auto-save to style folder |
| `filename` | str | None | Custom filename (auto-generated if None) |

### Style Parameters (from registry)

Automatically applied when using a style:
- `model`: FLUX model name
- `lora_name`: Style LoRA filename
- `lora_weight`: Style LoRA strength (0.0 - 2.0)
- `character_lora_weight`: Character LoRA strength
- `cine_lora_weight`: Cinematic LoRA strength
- `flux_guidance`: FLUX guidance value

## LoRA Stack Behavior

The workflow builder automatically manages LoRA strength based on the number of character LoRAs:

### Character LoRAs
- **1 character**: 85% of base strength (0.85 multiplier)
- **2 characters**: 75% of base strength (0.75 multiplier)
- **3+ characters**: 65% of base strength (0.65 multiplier)

### Cinematic LoRA
- **0 characters**: 100% of base strength (1.0 multiplier)
- **1 character**: 95% of base strength (0.95 multiplier)
- **2 characters**: 85% of base strength (0.85 multiplier)
- **3+ characters**: 75% of base strength (0.75 multiplier)

### Priority Order
1. Style LoRA (highest priority)
2. Character LoRAs
3. Film/Cinematic LoRA (if enabled)

## Example Scripts

See `examples/generate_images_example.py` for complete examples including:
- Simple generation
- Batch generation
- Custom settings
- Listing styles

Run it with:
```bash
python examples/generate_images_example.py
```

## Response Format

Successful generation returns:

```python
{
    "request_id": "img_a1b2c3d4",
    "status": "success",
    "images": ["base64_image_data..."],  # List of base64 strings
    "seed": 12345678,
    "style_id": "1",
    "saved_path": "/path/to/saved/image.png",
    "metadata": {
        "prompt": "...",
        "width": 1360,
        "height": 768,
        "steps": 20,
        "style_title": "Ink Intensity",
        "timestamp": "2025-10-11T14:20:35.123456Z"
    }
}
```

## Troubleshooting

### No RUNPOD_API_KEY error
```
ValueError: RUNPOD_API_KEY environment variable is required
```
**Solution**: Set RUNPOD_API_KEY in your `.env` file

### No serverless endpoint configured
```
ERROR: No serverless endpoint configured for mode: wizard
```
**Solution**: Set RUNPOD_SERVER_100_ID in your `.env` file

### Style not found
```
ERROR: Style not found: 999
```
**Solution**: Check available styles with `StylesRegistry().get_all_styles()`

### Generation timeout
If generation takes too long, you can adjust timeouts in `.env`:
```bash
SYNC_TIMEOUT=700  # 12 minutes for initial sync
MAX_POLLING_DURATION=180  # 3 minutes max polling
MAX_POLLING_ATTEMPTS=120  # 120 attempts at 1s intervals
```

## Performance Tips

1. **Faster generation**: Use fewer steps (15-20) for testing
2. **Better quality**: Use more steps (25-30) for final output
3. **Batch processing**: Use `generate_batch()` for multiple prompts
4. **Fixed seeds**: Use same seed for consistent results
5. **Resolution**: Lower resolution (768x512) generates faster

## Next Steps

Future enhancements planned:
- Upload generated images to S3
- Track generation history in styles registry
- Support for custom LoRA URLs in model_urls
- Integration with training pipeline
- Support for img2img and inpainting workflows
