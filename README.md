# actor_maker

A comprehensive toolkit for LoRA style model training and image generation using RunPod infrastructure.

## Overview

This repository provides tools for:
- **Style LoRA Training**: Generate training data and train custom style LoRA models
- **Image Generation**: Generate images via RunPod serverless workers or direct pod endpoints
- **Workflow Management**: Execute and manipulate ComfyUI workflows
- **Production-Ready**: Well-organized structure for large-scale projects

## Project Structure

```
actor_maker/
├── src/                    # Source code
│   ├── runpod/            # RunPod integration ✅
│   ├── styles/            # Styles registry ✅
│   ├── utils/             # Utilities ✅
│   ├── training/          # Training functionality (planned)
│   └── workflows_lib/     # Workflow management (planned)
├── data/                  # Styles registry and data files
├── workflows/             # ComfyUI workflow files
├── examples/              # Usage examples
├── scripts/               # Utility scripts
├── tests/                 # Test suite
└── docs/                  # Documentation
```

See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for detailed organization.

## Features

- **🎨 Style-Based Image Generation**: Generate images with custom styles using FLUX V4 workflows
- **🤖 RunPod Serverless Integration**: Uses RUNPOD_SERVER_100_ID for reliable image generation
- **📁 Automatic File Management**: Saves generated images to style-specific resource folders
- **🎯 LoRA Stack Support**: Dynamic LoRA stacks with up to 10 LoRAs (style + character + cinematic)
- **📦 Batch Generation**: Generate multiple images with consistent settings
- **🔄 AWS S3 Integration**: Upload/download files, manage training data with proper naming
- **🖼️ Image Processing**: Resize, convert formats, create thumbnails, base64 encoding
- **🧠 OpenAI GPT Integration**: Simple text and vision completions for analysis tasks
- **📚 Styles Registry**: Manage style metadata, LoRA versions, and training data
- **⚙️ ComfyUI Workflows**: Execute ComfyUI workflows for style transfer and image generation
- **🌍 Environment-based Configuration**: Matches backend environment variable names
- **📈 Scalable Architecture**: Organized for large project growth

## Installation

### Using Virtual Environment (Recommended)

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Linux/Mac
# or
venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements.txt

# For development
pip install pytest black flake8 mypy
```

### Without Virtual Environment

```bash
pip install -r requirements.txt

# For development
pip install pytest black flake8 mypy
```

**Note**: The project includes a `venv/` directory which is gitignored. Always activate the venv before installing packages.

## Environment Variables

Set these environment variables to configure RunPod access:

```bash
# Required
RUNPOD_API_KEY=your_runpod_api_key

# Optional - Pod configuration
SB_SPOT_API_KEY=your_pod_api_key
SB_SPOT_NAME=sb_spot

# Optional - Serverless endpoint IDs
RUNPOD_SERVER_100_ID=your_endpoint_id_100
RUNPOD_SERVER_150_ID=your_endpoint_id_150
RUNPOD_SERVER_SCHNELL_ID=your_schnell_endpoint_id
RUNPOD_SERVER_POSTER_ID=your_poster_endpoint_id

# Optional - Timeout configurations (seconds)
POD_TIMEOUT=600
SYNC_TIMEOUT=700
POLLING_INTERVAL=1.0
MAX_POLLING_DURATION=180
MAX_POLLING_ATTEMPTS=120
```

## Quick Start

### Generate Images with Styles (New!)

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
    print(f"✅ Image saved to: {result['saved_path']}")
    print(f"   Seed: {result['seed']}")
```

**See full documentation**: [docs/IMAGE_GENERATION.md](docs/IMAGE_GENERATION.md)

**Run examples**:
```bash
python examples/generate_images_example.py
```

### Low-Level Router (Advanced)

The router tries pod generation first and automatically falls back to serverless:

```python
from src.runpod import generate_image

# Prepare your payload
payload = {
    "input": {
        "workflow": {...},  # Your ComfyUI workflow
        "model_urls": [     # Optional LoRA models
            {"id": "model.safetensors", "url": "https://..."}
        ]
    }
}

# Generate with automatic routing
result = generate_image(
    payload=payload,
    mode="wizard",  # or "new_pre", "posterFrameRegeneration"
    request_id="my-request-123",
    pod_endpoint="https://xxx-8000.proxy.runpod.net"  # Optional
)

# Check result
if result and result["status"] == "COMPLETED":
    images = result["output"]["job_results"]["images"]
    print(f"Generated {len(images)} images")
```

### 2. Serverless Only

```python
from src.runpod import generate_serverless_image

result = generate_serverless_image(
    payload=payload,
    mode="wizard",
    request_id="serverless-123"
)
```

### 3. Pod Only

```python
from src.runpod import generate_pod_image

result = generate_pod_image(
    endpoint="https://xxx-8000.proxy.runpod.net",
    payload=payload,
    request_id="pod-123"
)
```

## Response Format

All generation functions return a standardized response:

```python
{
    "id": "job-id-123",
    "status": "COMPLETED",  # or "FAILED", "IN_PROGRESS", "IN_QUEUE"
    "output": {
        "job_results": {
            "images": [
                "base64_encoded_image_1",
                "base64_encoded_image_2"
            ]
        },
        "status": "success"
    }
}
```

## Modules

### `src/runpod/`
RunPod integration module with serverless and pod-based generation.

**Files**:
- `config.py` - Configuration and environment variable management
- `serverless.py` - Serverless worker image generation with intelligent polling
- `pod.py` - Direct pod-based image generation for running pods
- `router.py` - Smart router with automatic pod-to-serverless fallback

### `src/styles/` ✅ **COMPLETE**
Styles registry and management.

**Files**:
- `styles_registry.py` - Manage styles data, training status, LoRA versions

### `src/training/` (Planned)
Training functionality for LoRA models.

### `src/utils/` ✅ **COMPLETE**
Shared utility functions for image processing, S3 storage, and OpenAI integration.

**Files**:
- `s3.py` - AWS S3 client for file upload/download/delete
- `training_s3.py` - Specialized S3 utilities for training data
- `image_processing.py` - Image manipulation (resize, convert, base64)
- `openai_client.py` - OpenAI GPT text and vision completions

### `src/workflows_lib/` (Planned)
ComfyUI workflow management and manipulation.

## Examples

See example files for comprehensive usage patterns:

**RunPod Integration** (`examples/example_usage.py`):
- Router with automatic fallback
- Serverless-only generation
- Pod-only generation
- Error handling patterns

**S3 and Image Processing** (`examples/s3_usage.py`):
- Upload/download files from S3
- Image processing and conversion
- Training data management
- Base64 encoding/decoding

**OpenAI GPT Integration** (`examples/openai_usage.py`):
- Simple text completions
- JSON mode responses
- Vision analysis with images
- Style analysis examples

**Styles Registry** (`examples/styles_registry_usage.py`):
- Load and query styles
- Update training data
- Track LoRA versions
- Find styles needing training

Run examples:
```bash
cd examples
python example_usage.py           # RunPod examples
python s3_usage.py                # S3 and image processing examples
python openai_usage.py            # OpenAI GPT examples
python styles_registry_usage.py   # Styles registry examples
```

## Styles Management

Initialize the styles registry:
```bash
# Create sample registry with production styles
python scripts/sync_styles_from_backend.py --create-sample
```

Use in Python:
```python
from src.styles import load_registry, get_style

# Load registry
registry = load_registry()

# Get all styles
styles = registry.get_all_styles()

# Get specific style
style = registry.get_style_by_id("1")
print(f"Style: {style['title']}")
print(f"LoRA: {style['lora_name']}")

# Update training data
registry.update_training_data("1", training_images_count=50)
registry.save()
```

## Error Handling

```python
try:
    result = generate_image(payload, mode="wizard")
    
    if not result:
        print("Connection or timeout error")
    elif result["status"] == "COMPLETED":
        images = result["output"]["job_results"]["images"]
        print(f"Success: {len(images)} images")
    elif result["status"] == "FAILED":
        error = result["output"]["error"]
        print(f"Failed: {error}")
except Exception as e:
    print(f"Exception: {str(e)}")
```

## Logging

Enable detailed logging:

```python
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

## Testing

### Validate Setup
```bash
cd tests
python test_setup.py
```

### Run Tests (when available)
```bash
# All tests
python -m pytest tests/

# Unit tests only
python -m pytest tests/unit/

# Integration tests only
python -m pytest tests/integration/
```

## Architecture

The modules mirror the backend TypeScript implementation:
- **Router**: `runpodImageRequest.ts` → `src/runpod/router.py`
- **Serverless**: `runpodServerlessImageRequest.ts` → `src/runpod/serverless.py`
- **Pod**: `runpodPodImageRequest.ts` → `src/runpod/pod.py`
- **Config**: Environment variables match backend exactly

## Documentation

- **[README.md](README.md)** - This file, main documentation
- **[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)** - Detailed project organization
- **[docs/QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md)** - Quick reference card
- **[docs/IMPLEMENTATION_SUMMARY.md](docs/IMPLEMENTATION_SUMMARY.md)** - Implementation details

## Contributing

When adding new features:
1. Create modules in appropriate `/src/` subdirectory
2. Write tests in `/tests/unit/`
3. Add examples in `/examples/`
4. Update documentation
5. Follow the existing code style

See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for detailed guidelines.
