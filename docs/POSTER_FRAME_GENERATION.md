# Poster Frame Generation

This document describes the poster frame generation functionality for custom actors, which creates vibrant artistic illustrations suitable for actor thumbnails and promotional materials.

## Overview

The poster frame generator creates stylized storyboard art images of custom actors using:
- **ComfyUI Workflow**: FLUX-based image generation with LoRA support
- **RunPod Serverless**: Scalable GPU-powered generation
- **S3 Storage**: Automatic upload to AWS S3 for permanent storage

## Architecture

### Components

1. **Poster Frame Workflow** (`src/workflows_lib/poster_frame_workflow.py`)
   - ComfyUI workflow builder for poster frame generation
   - Based on backend `poster-frame.workflow.ts`
   - Supports style and character LoRAs
   - Configurable parameters (size, steps, guidance, etc.)

2. **Poster Frame Generator** (`src/poster_frame_generator.py`)
   - High-level service for generating poster frames
   - Handles RunPod communication and S3 upload
   - Based on backend `generatePosterFrameComfyUi.ts`

3. **RunPod Serverless Client** (`src/runpod/serverless.py`)
   - Manages RunPod serverless API requests
   - Intelligent polling and status handling
   - Error handling and retry logic

## Workflow Details

### Prompt Template

The poster frame uses a specialized prompt template designed for vibrant, artistic character illustrations:

```
vibrant artistic illustration of ({character_id}, {customActorDescription}) in a full body image, 
stylized storyboard art, direct eye contact with viewer, bright colorful palette, bold primary colors, 
strong highlights, artistic line work, graphic novel style, exaggerated expressions, 
character animation reference sheet, clean outlines, studio ghibli inspired, digital cel-shading, 
vivid background colors, illustration art, looking directly at camera, illustrative character design, 
flat color blocks with minimal gradients, high contrast, pop-art influence, animation key frame quality, 
bright lighting, storyboard artist masterpiece, simplified yet expressive features, square composition, 
centered framing, comic book cover, halftone dot texture, bold ink outlines, poster frame, 
(realistic body proportions++)
```

### Workflow Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `width` | 1024 | Image width in pixels |
| `height` | 1024 | Image height in pixels |
| `steps` | 22 | Number of sampling steps |
| `sampler_name` | "euler" | Sampler algorithm |
| `scheduler_name` | "simple" | Scheduler algorithm |
| `flux_guidance` | 6.5 | FLUX guidance strength |
| `model` | "flux1-dev-fp8" | Base model name |
| `style_lora_name` | "SBai_style_101" | Style LoRA name |
| `style_lora_strength` | 1.0 | Style LoRA strength |
| `character_lora_strength` | 0.7 | Character LoRA strength |

### LoRA Configuration

The workflow uses a 2-LoRA stack:
1. **Style LoRA** (slot 1): Controls the artistic style (default: SBai_style_101)
2. **Character LoRA** (slot 2): Controls the actor's appearance

## Usage

### Basic Usage

```python
from poster_frame_generator import generate_poster_frame

# Generate poster frame for an actor
result = generate_poster_frame(
    actor_id="0001_european_20_female",
    character_lora_name="0001_european_20_female",
    custom_actor_description="a young European woman with long brown hair, brown eyes, wearing casual clothing",
    user_id="user_12345"  # Optional: for user-specific S3 paths
)

print(f"Poster frame URL: {result['thumbnail_image_url']}")
```

### Advanced Usage

```python
from poster_frame_generator import PosterFrameGenerator

# Create generator instance
generator = PosterFrameGenerator()

# Generate with custom parameters
result = generator.generate_poster_frame(
    actor_id="0002_european_35_female",
    character_lora_name="0002_european_35_female",
    custom_actor_description="a mature European woman with short blonde hair, blue eyes, professional attire",
    user_id=None,  # No user-specific path
    style_lora_name="SBai_style_101",
    style_lora_strength=0.9,
    character_lora_strength=0.8,
    width=1024,
    height=1024,
    steps=25,
    seed=42  # Fixed seed for reproducibility
)
```

### Batch Generation

```python
from poster_frame_generator import PosterFrameGenerator

generator = PosterFrameGenerator()

actors = [
    {
        "id": "0000_european_16_male",
        "lora": "0000_european_16_male",
        "description": "a teenage European boy with short dark hair"
    },
    # ... more actors
]

for actor in actors:
    try:
        result = generator.generate_poster_frame(
            actor_id=actor['id'],
            character_lora_name=actor['lora'],
            custom_actor_description=actor['description']
        )
        print(f"✅ {actor['id']}: {result['thumbnail_image_url']}")
    except Exception as e:
        print(f"❌ {actor['id']}: {str(e)}")
```

## S3 Storage

### Path Structure

Poster frames are stored in S3 with the following path structure:

**With User ID:**
```
characters/{user_id}/{actor_id}/poster_frames/poster_{uuid}.jpeg
```

**Without User ID:**
```
actors/{actor_id}/poster_frames/poster_{timestamp}_{uuid}.jpeg
```

### Bucket Configuration

The S3 bucket is configured via environment variable:
- `AWS_USER_IMAGES_BUCKET`: Bucket name for poster frame storage

## Environment Variables

Required environment variables:

```bash
# RunPod Configuration
RUNPOD_API_KEY=your_runpod_api_key

# AWS S3 Configuration
AWS_ACCESS_KEY=your_aws_access_key
AWS_ACCESS_SECRET=your_aws_secret_key
AWS_REGION=us-west-1
AWS_USER_IMAGES_BUCKET=your-bucket-name
```

## Error Handling

The poster frame generator includes comprehensive error handling:

1. **RunPod Errors**: Automatic retry and polling timeout handling
2. **S3 Upload Errors**: Clear error messages for upload failures
3. **Image Download Errors**: Timeout and connection error handling
4. **Validation Errors**: Missing parameters and configuration validation

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `RunPod API key is required` | Missing RUNPOD_API_KEY | Set environment variable |
| `S3 bucket is required` | Missing AWS_USER_IMAGES_BUCKET | Set environment variable |
| `Poster frame generation failed` | RunPod job failed | Check RunPod logs and quota |
| `No images in RunPod output` | Workflow execution issue | Verify workflow parameters |

## Performance

### Generation Time

Typical generation times:
- **Queue time**: 0-30 seconds (depends on RunPod availability)
- **Generation time**: 10-30 seconds (depends on steps and size)
- **Upload time**: 1-5 seconds (depends on image size and network)
- **Total**: 15-60 seconds per poster frame

### Optimization Tips

1. **Reduce steps**: Use 18-20 steps for faster generation (slight quality trade-off)
2. **Batch processing**: Generate multiple poster frames in parallel
3. **Reuse generator**: Create one `PosterFrameGenerator` instance for multiple generations
4. **Fixed seeds**: Use fixed seeds for reproducible results (faster debugging)

## Examples

See `examples/generate_poster_frame_example.py` for complete working examples:

```bash
# Run the example script
python examples/generate_poster_frame_example.py
```

The example includes:
- Basic poster frame generation
- Custom parameter usage
- Batch generation for multiple actors

## Integration with Actor Training

Poster frames are typically generated after actor training completes:

```python
from poster_frame_generator import generate_poster_frame

# After training completes
actor_id = "0001_european_20_female"
lora_name = f"{actor_id}.safetensors"  # Trained LoRA model

# Generate poster frame
result = generate_poster_frame(
    actor_id=actor_id,
    character_lora_name=lora_name,
    custom_actor_description=actor_description,
    user_id=user_id
)

# Update actor manifest with poster frame URL
manifest['poster_frame_url'] = result['thumbnail_image_url']
```

## Comparison with Backend

This implementation matches the backend functionality:

| Feature | Backend (TypeScript) | Actor Maker (Python) |
|---------|---------------------|---------------------|
| Workflow | ✅ poster-frame.workflow.ts | ✅ poster_frame_workflow.py |
| Generator | ✅ generatePosterFrameComfyUi.ts | ✅ poster_frame_generator.py |
| RunPod Client | ✅ runpodServerlessImageRequest.ts | ✅ serverless.py |
| S3 Upload | ✅ AWS SDK | ✅ boto3 |
| Prompt Template | ✅ Identical | ✅ Identical |
| LoRA Stack | ✅ 2 LoRAs (style + character) | ✅ 2 LoRAs (style + character) |
| Parameters | ✅ Configurable | ✅ Configurable |

## Troubleshooting

### Poster Frame Not Generated

1. Check RunPod API key is valid
2. Verify character LoRA exists in RunPod storage
3. Check RunPod endpoint is configured correctly
4. Review RunPod logs for workflow errors

### S3 Upload Failed

1. Verify AWS credentials are correct
2. Check S3 bucket exists and is accessible
3. Verify IAM permissions for PutObject
4. Check network connectivity to S3

### Poor Quality Results

1. Increase sampling steps (22 → 25+)
2. Adjust character LoRA strength (0.7 → 0.8)
3. Verify character LoRA is properly trained
4. Try different style LoRA or strength

## Future Enhancements

Potential improvements:
- [ ] Support for multiple character LoRAs in one poster frame
- [ ] Custom background options
- [ ] Different artistic styles (beyond SBai_style_101)
- [ ] Aspect ratio variations (portrait, landscape)
- [ ] Batch optimization with parallel processing
- [ ] Caching and deduplication
