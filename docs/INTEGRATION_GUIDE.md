# Poster Frame Generation - Integration Guide

Quick guide for integrating poster frame generation into your actor training workflow.

## Quick Start

### 1. Install Dependencies

Ensure you have the required packages:

```bash
pip install boto3 requests replicate
```

### 2. Set Environment Variables

```bash
export RUNPOD_API_KEY="your_runpod_api_key"
export AWS_ACCESS_KEY="your_aws_access_key"
export AWS_ACCESS_SECRET="your_aws_secret_key"
export AWS_REGION="us-west-1"
export AWS_USER_IMAGES_BUCKET="your-bucket-name"
```

### 3. Basic Usage

```python
from src.poster_frame_generator import generate_poster_frame

# Generate poster frame
result = generate_poster_frame(
    actor_id="0001_european_20_female",
    character_lora_name="0001_european_20_female",
    custom_actor_description="a young European woman with long brown hair, brown eyes"
)

print(f"Poster frame URL: {result['thumbnail_image_url']}")
```

## Integration with Existing Scripts

### Option 1: Add to Training Pipeline

Integrate poster frame generation after training completes:

```python
# In your training script (e.g., scripts/train_actor.py)
from src.poster_frame_generator import generate_poster_frame

def train_and_generate_poster(actor_id, actor_description):
    # 1. Train the actor LoRA
    print(f"Training actor {actor_id}...")
    train_actor_lora(actor_id)
    
    # 2. Generate poster frame
    print(f"Generating poster frame for {actor_id}...")
    try:
        result = generate_poster_frame(
            actor_id=actor_id,
            character_lora_name=actor_id,
            custom_actor_description=actor_description
        )
        
        # 3. Update manifest with poster frame URL
        update_manifest(actor_id, {
            'poster_frame_url': result['thumbnail_image_url']
        })
        
        print(f"✅ Poster frame generated: {result['thumbnail_image_url']}")
        
    except Exception as e:
        print(f"⚠️ Poster frame generation failed: {str(e)}")
        # Continue without poster frame
```

### Option 2: Standalone Script

Create a dedicated script for generating poster frames:

```python
# scripts/generate_poster_frames.py
import json
from pathlib import Path
from src.poster_frame_generator import PosterFrameGenerator

def load_actor_manifests(data_dir="data/actor_manifests"):
    """Load all actor manifests."""
    manifests = []
    manifest_dir = Path(data_dir)
    
    for manifest_file in sorted(manifest_dir.glob("*_manifest.json")):
        with open(manifest_file, 'r') as f:
            manifests.append(json.load(f))
    
    return manifests

def generate_all_poster_frames():
    """Generate poster frames for all actors."""
    manifests = load_actor_manifests()
    generator = PosterFrameGenerator()
    
    for manifest in manifests:
        actor_id = manifest['id']
        
        # Skip if poster frame already exists
        if manifest.get('poster_frame_url'):
            print(f"⏭️  Skipping {actor_id} (already has poster frame)")
            continue
        
        print(f"Generating poster frame for {actor_id}...")
        
        try:
            result = generator.generate_poster_frame(
                actor_id=actor_id,
                character_lora_name=actor_id,
                custom_actor_description=manifest['description']
            )
            
            # Update manifest
            manifest['poster_frame_url'] = result['thumbnail_image_url']
            
            # Save updated manifest
            manifest_path = Path(f"data/actor_manifests/{actor_id}_manifest.json")
            with open(manifest_path, 'w') as f:
                json.dump(manifest, f, indent=2)
            
            print(f"✅ {actor_id}: {result['thumbnail_image_url']}")
            
        except Exception as e:
            print(f"❌ {actor_id}: {str(e)}")

if __name__ == "__main__":
    generate_all_poster_frames()
```

### Option 3: Regenerate Existing Actors

Regenerate poster frames for actors that already have LoRA models:

```python
# scripts/regenerate_poster_frames.py
import json
from pathlib import Path
from src.poster_frame_generator import PosterFrameGenerator

def regenerate_poster_frames(force=False):
    """Regenerate poster frames for trained actors."""
    generator = PosterFrameGenerator()
    
    # Find all trained actors
    actors_dir = Path("data/actors")
    
    for actor_dir in sorted(actors_dir.iterdir()):
        if not actor_dir.is_dir():
            continue
        
        actor_id = actor_dir.name
        manifest_path = Path(f"data/actor_manifests/{actor_id}_manifest.json")
        
        if not manifest_path.exists():
            continue
        
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
        
        # Skip if poster frame exists and not forcing
        if manifest.get('poster_frame_url') and not force:
            print(f"⏭️  Skipping {actor_id} (use --force to regenerate)")
            continue
        
        # Check if LoRA model exists
        if not manifest.get('lora_model_url'):
            print(f"⏭️  Skipping {actor_id} (no LoRA model)")
            continue
        
        print(f"Regenerating poster frame for {actor_id}...")
        
        try:
            result = generator.generate_poster_frame(
                actor_id=actor_id,
                character_lora_name=actor_id,
                custom_actor_description=manifest['description']
            )
            
            # Update manifest
            manifest['poster_frame_url'] = result['thumbnail_image_url']
            
            with open(manifest_path, 'w') as f:
                json.dump(manifest, f, indent=2)
            
            print(f"✅ {actor_id}: {result['thumbnail_image_url']}")
            
        except Exception as e:
            print(f"❌ {actor_id}: {str(e)}")

if __name__ == "__main__":
    import sys
    force = "--force" in sys.argv
    regenerate_poster_frames(force=force)
```

## Manifest Schema Update

Add poster frame URL to your actor manifest schema:

```json
{
  "id": "0001_european_20_female",
  "name": "European Woman 20",
  "description": "a young European woman with long brown hair, brown eyes",
  "lora_model_url": "s3://bucket/models/0001_european_20_female.safetensors",
  "poster_frame_url": "s3://bucket/poster_frames/poster_abc123.jpeg",
  "training_data": {
    "images": 20,
    "source_image": "s3://bucket/source.jpg"
  }
}
```

## Error Handling

Best practices for handling errors:

```python
from src.poster_frame_generator import generate_poster_frame

def safe_generate_poster_frame(actor_id, description, max_retries=3):
    """Generate poster frame with retry logic."""
    for attempt in range(max_retries):
        try:
            result = generate_poster_frame(
                actor_id=actor_id,
                character_lora_name=actor_id,
                custom_actor_description=description
            )
            return result
            
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"Attempt {attempt + 1} failed: {str(e)}")
                print(f"Retrying in 5 seconds...")
                time.sleep(5)
            else:
                print(f"All {max_retries} attempts failed")
                raise
```

## Performance Optimization

### Parallel Generation

Generate multiple poster frames in parallel:

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
from src.poster_frame_generator import PosterFrameGenerator

def generate_poster_frames_parallel(actors, max_workers=3):
    """Generate poster frames in parallel."""
    generator = PosterFrameGenerator()
    results = []
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all jobs
        future_to_actor = {
            executor.submit(
                generator.generate_poster_frame,
                actor['id'],
                actor['lora'],
                actor['description']
            ): actor
            for actor in actors
        }
        
        # Collect results
        for future in as_completed(future_to_actor):
            actor = future_to_actor[future]
            try:
                result = future.result()
                results.append({
                    'actor_id': actor['id'],
                    'success': True,
                    'url': result['thumbnail_image_url']
                })
                print(f"✅ {actor['id']}")
            except Exception as e:
                results.append({
                    'actor_id': actor['id'],
                    'success': False,
                    'error': str(e)
                })
                print(f"❌ {actor['id']}: {str(e)}")
    
    return results
```

## Testing

Test the integration before production use:

```python
# Test with a single actor
def test_poster_frame_generation():
    """Test poster frame generation."""
    test_actor = {
        'id': 'test_actor',
        'lora': 'test_actor',
        'description': 'a test character for validation'
    }
    
    try:
        result = generate_poster_frame(
            actor_id=test_actor['id'],
            character_lora_name=test_actor['lora'],
            custom_actor_description=test_actor['description']
        )
        
        print("✅ Test passed!")
        print(f"URL: {result['thumbnail_image_url']}")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        return False

if __name__ == "__main__":
    test_poster_frame_generation()
```

## Monitoring

Add logging for production monitoring:

```python
import logging
from src.poster_frame_generator import PosterFrameGenerator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('poster_frame_generation.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

def generate_with_monitoring(actor_id, description):
    """Generate poster frame with detailed logging."""
    logger.info(f"Starting poster frame generation for {actor_id}")
    
    try:
        result = generate_poster_frame(
            actor_id=actor_id,
            character_lora_name=actor_id,
            custom_actor_description=description
        )
        
        logger.info(f"Successfully generated poster frame for {actor_id}")
        logger.info(f"URL: {result['thumbnail_image_url']}")
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to generate poster frame for {actor_id}: {str(e)}")
        raise
```

## Next Steps

1. **Test the integration** with a single actor
2. **Update your manifest schema** to include poster_frame_url
3. **Integrate into training pipeline** or create standalone script
4. **Monitor performance** and adjust parameters as needed
5. **Scale to batch processing** once validated

For more details, see:
- [POSTER_FRAME_GENERATION.md](./POSTER_FRAME_GENERATION.md) - Complete documentation
- [examples/generate_poster_frame_example.py](../examples/generate_poster_frame_example.py) - Working examples
