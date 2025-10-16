# Actor Training Data Generation with Replicate

This document describes the automated actor training data generation system that creates 17 diverse, cinematic training images from a single portrait using Replicate's flux-kontext-pro.

## Overview

The actor training data generator uses carefully crafted cinematic prompts to create high-quality, diverse training images optimized for character/actor LoRA training:

1. **Portrait Preparation**: Normalizes portrait to JPEG format
2. **Prompt Generation**: Creates 17 diverse cinematic prompts based on actor type
3. **Image Generation**: Uses flux-kontext-pro with 16:9 aspect ratio
4. **S3 Upload**: Stores training images in AWS S3
5. **Debug Grid**: Creates overview grid for quick inspection

## Training Image Composition

The generator creates **17 diverse training images**:

### Photorealistic (7 images)
- Rain-slick street action scene at night
- Close-up candid portrait with direct eye contact (facial features)
- Close-up with warm window lighting
- Subway platform scene
- Parking garage walk
- Rooftop silhouette
- Alley phone call

### Black & White Stylized (6 images)
- Pen & ink line drawing
- Graphite pencil sketch
- Charcoal drawing
- Woodcut print style
- Monochrome vector illustration
- Manga illustration with screentones

### Color Stylized (4 images)
- Comic book illustration
- Flat vector illustration
- Watercolor painting
- Gouache painting

## Features

### Cinematic Prompts
- **Action-focused**: Running, kicking doors, climbing stairs
- **Varied lighting**: Night scenes, window light, neon, harsh shadows
- **Multiple angles**: Profile, three-quarter, close-up, rear view
- **Diverse settings**: Urban streets, warehouses, trains, alleys, interiors

### Actor Type Support
Automatically adjusts prompts based on actor type:
- **Human**: "man" or "woman" descriptor
- **Creature**: "creature" descriptor
- **Robotic**: "robotic character" descriptor
- **Anthropomorphic**: "anthropomorphic character" descriptor
- **Mythical**: "mythical character" descriptor

### Quality Control
- Portrait normalization to JPEG
- 16:9 cinematic aspect ratio
- Safety tolerance level 6
- Batch processing with error resilience

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

# AWS credentials (required for S3 uploads)
AWS_ACCESS_KEY=your_aws_access_key
AWS_ACCESS_SECRET=your_aws_secret_key
AWS_REGION=us-west-1
AWS_USER_FILES_BUCKET=your-bucket-name
```

### 3. Verify Setup

```bash
python examples/generate_actor_training_data_example.py
```

## Usage

### Basic Usage

```python
from src.actor_training_data_generator import ActorTrainingDataGenerator

# Initialize generator
generator = ActorTrainingDataGenerator(
    debug_dir="debug/actor_training_data"
)

# Generate training data
result = generator.generate_training_data(
    portrait_url="https://your-portrait.jpg",
    user_id="user_123",
    actor_id="actor_456",
    actor_type="human",
    actor_sex="male"
)

# Access results
print(f"Generated {result['total_training_images']} training images")

for url in result['training_image_urls']:
    print(f"Training image: {url}")
```

### Advanced Configuration

```python
# Custom batch size
generator = ActorTrainingDataGenerator(
    replicate_token="custom_token",
    debug_dir="custom/debug/path",
    batch_size=3  # Smaller batches for rate limiting
)

# Different actor types
result = generator.generate_training_data(
    portrait_url="https://creature-portrait.jpg",
    user_id="user_123",
    actor_id="creature_789",
    actor_type="creature",  # Will use "creature" in prompts
    actor_sex=None  # Not applicable for creatures
)
```

### Using Pre-loaded Portrait Buffer

```python
# If you already have the portrait in memory
with open("portrait.jpg", "rb") as f:
    portrait_buffer = f.read()

result = generator.generate_training_data(
    portrait_url="https://fallback-url.jpg",  # Used if buffer fails
    user_id="user_123",
    actor_id="actor_456",
    actor_type="human",
    actor_sex="female",
    portrait_buffer=portrait_buffer  # Avoids re-downloading
)
```

## Architecture

### Module Structure

```
src/
├── replicate_service.py              # Replicate API integration
├── actor_training_data_generator.py  # Main generator service
└── actor_training_prompts.py         # Cinematic prompt templates
```

### Generation Flow

```
1. Load Portrait Image
   ↓
2. Normalize to JPEG
   ↓
3. Get Actor Descriptor (man/woman/creature/etc.)
   ↓
4. Generate 12 Cinematic Prompts
   ↓
5. Process in Batches (5 at a time)
   ↓
6. Generate with flux-kontext-pro (16:9)
   ↓
7. Upload to S3
   ↓
8. Create Debug Grid
```

## API Reference

### ActorTrainingDataGenerator

#### `__init__(replicate_token=None, debug_dir=None, batch_size=5)`

Initialize the actor training data generator.

**Parameters:**
- `replicate_token` (str, optional): Replicate API token
- `debug_dir` (str, optional): Directory for debug images
- `batch_size` (int, optional): Images to process in parallel (default: 5)

#### `generate_training_data(portrait_url, user_id, actor_id, actor_type="human", actor_sex=None, portrait_buffer=None)`

Generate training data from a single portrait image.

**Parameters:**
- `portrait_url` (str): URL of the portrait image
- `user_id` (str): User ID for S3 uploads
- `actor_id` (str): Actor ID for organizing files
- `actor_type` (str): Actor type ("human", "creature", "robotic", "anthropomorphic", "mythical")
- `actor_sex` (str, optional): Actor sex ("male", "female", None)
- `portrait_buffer` (bytes, optional): Pre-loaded portrait buffer

**Returns:**
```python
{
    "training_image_urls": ["url1", "url2", ...],  # List of 12 S3 URLs
    "total_training_images": 12,                    # Number generated
    "target_training_images": 12                    # Target count
}
```

### Actor Training Prompts

#### `get_actor_training_prompts(descriptor)`

Get all 12 training prompts for an actor.

**Parameters:**
- `descriptor` (str): Character descriptor (e.g., "man", "woman", "creature")

**Returns:** List of 12 prompt strings

#### `get_actor_descriptor(actor_type, actor_sex=None)`

Get the descriptor string for an actor.

**Parameters:**
- `actor_type` (str): Type of actor
- `actor_sex` (str, optional): Sex of actor

**Returns:** Descriptor string (e.g., "man", "woman", "creature")

## Performance

### Typical Generation Times

- **Portrait Normalization**: ~1 second
- **Image Generation**: ~30 seconds per image
- **S3 Upload**: ~2 seconds per image
- **Total Time**: ~6-8 minutes for 12 images

### Cost Estimates (Replicate)

- **flux-kontext-pro**: ~$0.05 per image
- **Total for 12 images**: ~$0.60

## Prompt Examples

### Photorealistic Prompts

```
The man runs across a rain-slick street at night, mid-stride, 
lit by car headlights from the side. Three-quarter back angle. 
Reflections on the asphalt, no other figures in frame.

A close-up of the woman's face bathed in soft orange window light, 
jaw clenched, looking intently off-frame to the left. The camera is 
slightly below eye level. Preserve all defining details such as 
hairstyle, makeup, scars, or headgear if present.
```

### Stylized Prompts

```
A black-and-white pen and ink line drawing of the creature tying 
their bootlaces on a townhouse stoop under a single streetlamp in 
light rain. High-contrast lines with crosshatching and stippling 
for shading, no grayscale gradients.

A dynamic comic book illustration of the robotic character leaping 
a narrow rooftop gap at night with a city skyline behind. Low angle, 
foreshortened limbs, speed lines, bold inks, cel-shaded color.
```

## Debugging

### Debug Images

When `debug_dir` is specified, the generator saves:
- `training_data_output_1.jpg` through `training_data_output_12.jpg` - Individual images
- `training_data_grid.jpg` - 4x3 grid overview of all images
- `request_payload_1.json` through `request_payload_12.json` - Request details

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

**Issue: "Failed to normalize portrait image"**
- Solution: Check portrait image format and size
- System will fallback to original buffer

**Issue: "Only generated X/12 images"**
- Solution: Check Replicate API status and quotas
- Review debug logs for specific errors
- Some prompts may fail due to content filters

## Integration with Training Pipeline

### Complete Training Flow

```python
from src.actor_training_data_generator import ActorTrainingDataGenerator
from src.training.client import TrainingClient

# Step 1: Generate training data
generator = ActorTrainingDataGenerator()
result = generator.generate_training_data(
    portrait_url=portrait_url,
    user_id=user_id,
    actor_id=actor_id,
    actor_type="human",
    actor_sex="male"
)

# Step 2: Train LoRA model
training_client = TrainingClient()
training_result = training_client.train_actor(
    actor_id=actor_id,
    training_image_urls=result['training_image_urls'],
    # ... other training parameters
)
```

## Differences from Style Training

### Actor Training (This System)
- **Purpose**: Character/face identity preservation
- **Prompts**: Cinematic action scenes and stylized illustrations
- **Count**: 12 images (2 photo + 6 B/W + 4 color)
- **Aspect Ratio**: 16:9 (cinematic)
- **Focus**: Character consistency across scenes and styles

### Style Training (Alternative System)
- **Purpose**: Artistic style transfer
- **Prompts**: Generic tile descriptions (people, landscapes, objects)
- **Count**: 20 images from 3x3 grids
- **Aspect Ratio**: 1:1 (square)
- **Focus**: Style consistency across subjects

## Best Practices

1. **Portrait Quality**: Use high-quality, well-lit portraits (512x512 or larger)
2. **Clear Features**: Ensure face is clearly visible and well-defined
3. **Actor Type**: Choose correct type for best prompt matching
4. **Debug Mode**: Enable debug images for first-time testing
5. **Batch Size**: Reduce batch size if hitting rate limits
6. **Error Handling**: Implement retry logic for production use

## Future Enhancements

- [ ] Support for custom prompt templates
- [ ] Configurable image count (e.g., 20 images)
- [ ] Alternative aspect ratios (1:1, 4:3)
- [ ] Parallel batch processing
- [ ] Prompt variation system

## Support

For issues or questions:
1. Check debug images in `debug/actor_training_data/`
2. Review logs for error messages
3. Verify environment variables are set
4. Check Replicate API status

## License

This actor training data generation system is part of the actor_maker project.
