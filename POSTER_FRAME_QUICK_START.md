# Poster Frame Generation - Quick Start

## 🚀 Quick Start (5 minutes)

### 1. Set Environment Variables

```bash
export RUNPOD_API_KEY="your_runpod_api_key"
export AWS_ACCESS_KEY="your_aws_access_key"
export AWS_ACCESS_SECRET="your_aws_secret_key"
export AWS_USER_IMAGES_BUCKET="your-bucket-name"
```

### 2. Generate Your First Poster Frame

```python
from src.poster_frame_generator import generate_poster_frame

result = generate_poster_frame(
    actor_id="0001_european_20_female",
    character_lora_name="0001_european_20_female",
    custom_actor_description="a young European woman with long brown hair, brown eyes"
)

print(f"✅ Poster frame: {result['thumbnail_image_url']}")
```

### 3. Run the Example

```bash
python examples/generate_poster_frame_example.py
```

## 📋 Common Use Cases

### Use Case 1: Generate After Training

```python
# After training completes
from src.poster_frame_generator import generate_poster_frame

result = generate_poster_frame(
    actor_id=actor_id,
    character_lora_name=actor_id,
    custom_actor_description=actor_description
)

# Update manifest
manifest['poster_frame_url'] = result['thumbnail_image_url']
```

### Use Case 2: Batch Generate for All Actors

```python
from src.poster_frame_generator import PosterFrameGenerator

generator = PosterFrameGenerator()

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

### Use Case 3: Custom Parameters

```python
from src.poster_frame_generator import PosterFrameGenerator

generator = PosterFrameGenerator()

result = generator.generate_poster_frame(
    actor_id="0002_european_35_female",
    character_lora_name="0002_european_35_female",
    custom_actor_description="a mature European woman",
    style_lora_name="SBai_style_101",
    style_lora_strength=0.9,
    character_lora_strength=0.8,
    steps=25,
    seed=42  # Fixed seed for reproducibility
)
```

## 🎨 What You Get

The poster frame generator creates:

- **Vibrant artistic illustrations** in storyboard style
- **Square composition** (1024x1024) perfect for thumbnails
- **Direct eye contact** with viewer
- **Colorful palette** with bold primary colors
- **Studio Ghibli inspired** digital cel-shading
- **Animation reference quality** artwork

## ⚙️ Default Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `width` | 1024 | Image width |
| `height` | 1024 | Image height |
| `steps` | 22 | Sampling steps |
| `style_lora_name` | "SBai_style_101" | Style LoRA |
| `style_lora_strength` | 1.0 | Style strength |
| `character_lora_strength` | 0.7 | Character strength |
| `seed` | None | Random seed (None = random) |

## 📁 Output Location

Poster frames are stored in S3:

**With User ID:**
```
s3://bucket/characters/{user_id}/{actor_id}/poster_frames/poster_{uuid}.jpeg
```

**Without User ID:**
```
s3://bucket/actors/{actor_id}/poster_frames/poster_{timestamp}_{uuid}.jpeg
```

## ⏱️ Performance

- **Total Time**: 15-60 seconds per poster frame
- **Queue**: 0-30s (depends on RunPod)
- **Generation**: 10-30s (depends on steps)
- **Upload**: 1-5s

## 🐛 Troubleshooting

### Error: "RunPod API key is required"
```bash
export RUNPOD_API_KEY="your_key"
```

### Error: "S3 bucket is required"
```bash
export AWS_USER_IMAGES_BUCKET="your-bucket-name"
```

### Error: "Poster frame generation failed"
- Check RunPod quota and endpoint status
- Verify character LoRA exists in RunPod storage
- Review RunPod logs for workflow errors

## 📚 Documentation

- **Full Documentation**: [docs/POSTER_FRAME_GENERATION.md](docs/POSTER_FRAME_GENERATION.md)
- **Integration Guide**: [docs/INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md)
- **Examples**: [examples/generate_poster_frame_example.py](examples/generate_poster_frame_example.py)
- **Implementation Summary**: [POSTER_FRAME_IMPLEMENTATION.md](POSTER_FRAME_IMPLEMENTATION.md)

## 🎯 Next Steps

1. ✅ Test with example script
2. ✅ Generate poster frame for one actor
3. ✅ Integrate into your training pipeline
4. ✅ Update manifest schema to include `poster_frame_url`
5. ✅ Scale to batch processing

## 💡 Pro Tips

- **Reuse generator instance** for multiple generations
- **Use fixed seeds** for reproducible results during testing
- **Reduce steps to 18-20** for faster generation (slight quality trade-off)
- **Batch process** multiple actors in parallel (max 3 workers recommended)
- **Monitor logs** for debugging and performance tracking

## 🔗 Quick Links

- Backend source: `/apps/core/src/custom-actors/utils/generatePosterFrameComfyUi.ts`
- Workflow source: `/apps/core/src/custom-actors/utils/poster-frame.workflow.ts`
- Python implementation: `src/poster_frame_generator.py`
- Workflow builder: `src/workflows_lib/poster_frame_workflow.py`
