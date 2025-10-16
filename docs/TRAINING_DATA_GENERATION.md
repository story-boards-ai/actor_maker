# Training Data Generation with Replicate

This document describes the automated training data generation system that creates 20 diverse training images from a single source image using Replicate's flux-kontext-pro and Topaz Labs upscaling.

## Overview

The training data generator uses a sophisticated pipeline to create high-quality, diverse training images:

1. **Grid Generation**: Creates 3x3 grids with diverse subjects using flux-kontext-pro
2. **Uniqueness Analysis**: Uses GPT Vision to identify unique tiles
3. **Grid Splitting**: Extracts individual tiles from the grid
4. **Upscaling**: Enhances image quality with Topaz Labs 2x upscaling
5. **S3 Upload**: Stores training images in AWS S3

## Features

### Diverse Subject Matter
- **63 tile descriptions** across 7 categories:
  - People & Portraits (9 options)
  - Nature & Landscapes (9 options)
  - Objects & Still Life (9 options)
  - Architecture & Structures (9 options)
  - Animals & Creatures (9 options)
  - Transportation & Vehicles (9 options)
  - Abstract & Artistic (9 options)

### Smart Rotation System
- Avoids repeating descriptions across grids
- Automatically resets when pool is exhausted
- Ensures maximum variety in training data

### Batch Processing
- Processes upscaling in batches of 3
- Resilient error handling
- Progress logging for each batch

### Quality Control
- GPT Vision analysis for uniqueness
- Fallback to corner/center tiles if needed
- Debug image saving for inspection

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# Replicate API token (required)
REPLICATE_API_TOKEN=your_replicate_token_here

# OpenAI API key (required for GPT Vision)
OPENAI_API_KEY=your_openai_key_here

# AWS credentials (required for S3 uploads)
AWS_ACCESS_KEY=your_aws_access_key
AWS_ACCESS_SECRET=your_aws_secret_key
AWS_REGION=us-west-1
AWS_USER_FILES_BUCKET=your-bucket-name
```

### 3. Verify Setup

```bash
python examples/generate_training_data_example.py
```

## Usage

### Basic Usage

```python
from src.training_data_generator import TrainingDataGenerator

# Initialize generator
generator = TrainingDataGenerator(
    debug_dir="debug/training_data"  # Optional: save debug images
)

# Generate training data
result = generator.generate_training_data(
    source_image_url="https://your-source-image.jpg",
    user_id="user_123",
    actor_id="actor_456"
)

# Access results
print(f"Generated {result['total_training_images']} training images")
print(f"From {result['total_grids_generated']} grids")

for url in result['training_image_urls']:
    print(f"Training image: {url}")
```

### Advanced Configuration

```python
generator = TrainingDataGenerator(
    replicate_token="custom_token",
    openai_api_key="custom_key",
    debug_dir="custom/debug/path"
)

# Customize generation parameters
generator.target_training_images = 30  # Generate 30 images instead of 20
generator.max_generation_attempts = 15  # Allow more attempts
generator.batch_size = 5  # Larger upscaling batches
```

## Architecture

### Module Structure

```
src/
├── replicate_service.py           # Replicate API integration
├── training_data_generator.py     # Main generator service
└── training_data_utils/
    ├── __init__.py
    ├── tile_descriptions.py       # 63 diverse descriptions
    ├── description_selector.py    # Smart rotation logic
    └── prompt_builder.py          # Prompt generation
```

### Generation Flow

```
1. Download Source Image
   ↓
2. Generate 3x3 Grid (flux-kontext-pro)
   ↓
3. Analyze Uniqueness (GPT Vision)
   ↓
4. Split Grid into Tiles
   ↓
5. Select Unique Tiles
   ↓
6. Upscale Tiles (Topaz Labs 2x)
   ↓
7. Upload to S3
   ↓
8. Repeat until 20 images collected
```

## API Reference

### TrainingDataGenerator

#### `__init__(replicate_token=None, openai_api_key=None, debug_dir=None)`

Initialize the training data generator.

**Parameters:**
- `replicate_token` (str, optional): Replicate API token
- `openai_api_key` (str, optional): OpenAI API key
- `debug_dir` (str, optional): Directory for debug images

#### `generate_training_data(source_image_url, user_id, actor_id)`

Generate training data from a single source image.

**Parameters:**
- `source_image_url` (str): URL of the source image
- `user_id` (str): User ID for S3 uploads
- `actor_id` (str): Actor ID for organizing files

**Returns:**
```python
{
    "training_image_urls": ["url1", "url2", ...],  # List of S3 URLs
    "total_grids_generated": 3,                     # Number of grids created
    "total_training_images": 20                     # Number of final images
}
```

### ReplicateService

#### `generate_grid_with_flux_kontext(prompt, input_image_base64, aspect_ratio="1:1", output_format="jpg")`

Generate a 3x3 tile grid using flux-kontext-pro.

**Returns:** URL of generated grid image

#### `upscale_with_topaz(image_base64, enhance_model="Standard V2", upscale_factor="2x", output_format="jpg")`

Upscale image using Topaz Labs Image Upscaler.

**Returns:** URL of upscaled image

## Performance

### Typical Generation Times

- **Grid Generation**: ~30 seconds per grid
- **GPT Vision Analysis**: ~5 seconds per grid
- **Upscaling (batch of 3)**: ~90 seconds per batch
- **Total Time**: ~5-10 minutes for 20 images

### Cost Estimates (Replicate)

- **flux-kontext-pro**: ~$0.05 per grid
- **Topaz Labs Upscaler**: ~$0.02 per image
- **Total for 20 images**: ~$0.50-$1.00

## Debugging

### Debug Images

When `debug_dir` is specified, the generator saves:
- `grid1.jpg`, `grid2.jpg`, etc. - Generated 3x3 grids
- `training-image1.jpg`, `training-image2.jpg`, etc. - Final training images

### Logging

Enable detailed logging:

```python
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

### Common Issues

**Issue: "REPLICATE_API_TOKEN not set"**
- Solution: Add `REPLICATE_API_TOKEN` to your `.env` file

**Issue: "OPENAI_API_KEY not set"**
- Solution: Add `OPENAI_API_KEY` to your `.env` file

**Issue: "Only generated X/20 images"**
- Solution: Increase `max_generation_attempts` parameter
- Check Replicate API status and quotas

**Issue: GPT Vision returns no unique tiles**
- Solution: System automatically falls back to corner/center tiles
- Check grid image quality in debug folder

## Integration with Training Pipeline

### Using with Existing Training System

```python
from src.training_data_generator import TrainingDataGenerator
from src.training.client import TrainingClient

# Generate training data
generator = TrainingDataGenerator()
result = generator.generate_training_data(
    source_image_url=source_url,
    user_id=user_id,
    actor_id=actor_id
)

# Use generated images for training
training_client = TrainingClient()
training_result = training_client.train_actor(
    actor_id=actor_id,
    training_image_urls=result['training_image_urls'],
    # ... other training parameters
)
```

## Best Practices

1. **Source Image Quality**: Use high-quality source images (1024x1024 or larger)
2. **Diverse Styles**: Works best with distinct artistic styles
3. **Debug Mode**: Enable debug images for first-time testing
4. **Error Handling**: Implement retry logic for production use
5. **Cost Monitoring**: Track Replicate API usage and costs

## Future Enhancements

- [ ] Support for custom description pools
- [ ] Configurable grid sizes (4x4, 5x5)
- [ ] Alternative upscaling methods
- [ ] Parallel grid generation
- [ ] Caching for repeated generations

## Support

For issues or questions:
1. Check debug images in `debug/training_data/`
2. Review logs for error messages
3. Verify environment variables are set
4. Check Replicate API status

## License

This training data generation system is part of the actor_maker project.
