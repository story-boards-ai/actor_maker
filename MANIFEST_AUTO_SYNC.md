# Training Data Manifest - Auto-Sync System

## Overview

The manifest is **automatically created and synced** when you open the training data tab for an actor. It scans S3, detects changes, and maintains a single source of truth.

## Auto-Initialization

### When Training Data Tab Opens:

```python
from src.training_data_api import get_training_data_api

# This is called when user opens training data tab
api = get_training_data_api()
training_data = api.get_training_data(
    actor_id="0001_european_20_female",
    bucket="story-boards-assets"
)
```

### What Happens Automatically:

1. **Scans S3** for all training images in `system_actors/training_data/{actor_id}/`
2. **Creates manifest** if it doesn't exist (`data/actors/{actor_id}/training_data/manifest.json`)
3. **Syncs with S3** if manifest exists:
   - Detects deleted files → Removes from manifest
   - Detects new files → Adds to manifest
   - Updates timestamps for existing files
4. **Returns all training data** with complete metadata

## Manifest Structure

### Location:
```
data/actors/{actor_id}/training_data/manifest.json
```

### Full Structure:
```json
{
  "actor_id": "0001_european_20_female",
  "created_at": "2025-10-16T10:00:00.000000",
  "updated_at": "2025-10-16T12:51:00.000000",
  "total_images": 13,
  "generations": [
    {
      "generation_id": 1,
      "type": "s3_scan",
      "generated_at": "2025-10-16T10:00:00.000000",
      "image_count": 13,
      "metadata": {
        "scanned_at": "2025-10-16T10:00:00.000000",
        "total_scanned": 13
      }
    }
  ],
  "images": {
    "0001_european_20_female_15.jpg": {
      "s3_url": "https://story-boards-assets.s3.us-west-1.amazonaws.com/system_actors/training_data/0001_european_20_female/0001_european_20_female_15.jpg",
      "s3_key": "system_actors/training_data/0001_european_20_female/0001_european_20_female_15.jpg",
      "prompt": "Close-up of the woman looking out a rain-streaked window...",
      "prompt_preview": "Close-up of the woman looking out a rain-streaked window, warm interior light from the side...",
      "generated_at": "2025-10-16T11:53:01.456489",
      "last_modified": "2025-10-16T11:53:01.456489",
      "size": 245678,
      "etag": "abc123def456",
      "index": 1,
      "generation_id": 1,
      "generation_type": "s3_scan",
      "source": "s3_scan"
    }
    // ... more images
  }
}
```

## Tracked Metadata Per Image

✅ **S3 URL** - Full HTTPS URL to the image
✅ **S3 Key** - S3 object key for deletion/updates
✅ **Prompt** - Full prompt used to generate the image
✅ **Prompt Preview** - First 100 characters for quick display
✅ **Generated At** - When the image was originally created
✅ **Last Modified** - S3 last modified timestamp (auto-updated)
✅ **Size** - File size in bytes (auto-updated)
✅ **ETag** - S3 ETag for change detection
✅ **Index** - Sequential index number
✅ **Generation ID** - Which generation this image belongs to
✅ **Generation Type** - How it was created (s3_scan, replicate_flux_kontext, etc.)
✅ **Source** - Original source of the image

## Auto-Sync Features

### 1. Detects Deleted Files

When you delete a file from S3, the next time the training data tab is opened:

```python
# Before sync: 13 images in manifest
# User deletes 2 images from S3
# On next tab open:
api.get_training_data(actor_id)  # Auto-detects deletion
# After sync: 11 images in manifest
```

**Log output:**
```
Detected 2 deleted images
Removing deleted image: 0001_european_20_female_15.jpg
Removing deleted image: 0001_european_20_female_16.jpg
Removed 2 deleted images from manifest
```

### 2. Detects New Files

When you upload new files to S3:

```python
# Before sync: 13 images in manifest
# User uploads 5 new images to S3
# On next tab open:
api.get_training_data(actor_id)  # Auto-detects additions
# After sync: 18 images in manifest
```

**Log output:**
```
Detected 5 new images
Added 5 new images to manifest
```

### 3. Updates Timestamps

When files are modified in S3:

```python
# Auto-updates last_modified, size, and etag for changed files
```

## API Methods

### Get Training Data (Auto-Initialize)

```python
from src.training_data_api import get_training_data_api

api = get_training_data_api()

# This auto-creates/syncs the manifest
training_data = api.get_training_data(
    actor_id="0001_european_20_female",
    bucket="story-boards-assets",
    s3_prefix="system_actors/training_data/0001_european_20_female/",
    force_rescan=False  # Set True to force full S3 rescan
)

# Returns:
{
    "actor_id": "0001_european_20_female",
    "total_images": 13,
    "total_generations": 1,
    "created_at": "2025-10-16T10:00:00",
    "updated_at": "2025-10-16T12:51:00",
    "manifest_path": "data/actors/0001_european_20_female/training_data/manifest.json",
    "images": [...],  # List of all images with metadata
    "generations": [...]  # List of all generations
}
```

### Delete Training Image

```python
# Delete from manifest only
api.delete_training_image(
    actor_id="0001_european_20_female",
    filename="0001_european_20_female_15.jpg",
    delete_from_s3=False
)

# Delete from both manifest AND S3
api.delete_training_image(
    actor_id="0001_european_20_female",
    filename="0001_european_20_female_15.jpg",
    delete_from_s3=True  # Also deletes from S3
)
```

### Force Rescan

```python
# Force full S3 rescan (useful after bulk operations)
training_data = api.rescan_s3(
    actor_id="0001_european_20_female",
    bucket="story-boards-assets"
)
```

## Integration with Backend

### Node.js/TypeScript Example

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// When user opens training data tab
async function getTrainingData(actorId: string) {
  const command = `python -c "
from src.training_data_api import get_training_data_api
import json
api = get_training_data_api()
data = api.get_training_data('${actorId}')
print(json.dumps(data))
"`;
  
  const { stdout } = await execAsync(command, {
    cwd: '/path/to/actor_maker'
  });
  
  return JSON.parse(stdout);
}

// Usage
const trainingData = await getTrainingData('0001_european_20_female');
console.log(`Found ${trainingData.total_images} training images`);
```

### REST API Example

Create a simple Flask API:

```python
from flask import Flask, jsonify
from src.training_data_api import get_training_data_api

app = Flask(__name__)
api = get_training_data_api()

@app.route('/api/training-data/<actor_id>')
def get_training_data(actor_id):
    data = api.get_training_data(actor_id)
    return jsonify(data)

@app.route('/api/training-data/<actor_id>/rescan', methods=['POST'])
def rescan_training_data(actor_id):
    data = api.rescan_s3(actor_id)
    return jsonify(data)
```

## Workflow

### First Time Opening Training Data Tab:

1. User opens training data tab for `actor_456`
2. Backend calls `api.get_training_data('actor_456')`
3. System scans S3: finds 13 existing images
4. Creates manifest at `data/actors/actor_456/training_data/manifest.json`
5. Returns all 13 images with metadata
6. Frontend displays images

### Subsequent Opens:

1. User opens training data tab again
2. Backend calls `api.get_training_data('actor_456')`
3. System loads existing manifest
4. Scans S3 to detect changes
5. Updates manifest (removes deleted, adds new)
6. Returns updated training data
7. Frontend displays current state

### After Generating New Training Data:

1. User generates 17 new images via Replicate
2. `ActorTrainingDataGenerator` saves to S3 and updates manifest
3. Manifest now has 2 generations (13 existing + 17 new = 30 total)
4. Next time tab opens, all 30 images are shown

## Benefits

✅ **Auto-initialization** - No manual manifest creation needed
✅ **Always in sync** - Detects S3 changes automatically
✅ **Deletion tracking** - Removes deleted files from manifest
✅ **Addition tracking** - Adds new files to manifest
✅ **Timestamp updates** - Keeps modification times current
✅ **Single source of truth** - One manifest per actor
✅ **Generation history** - Tracks when and how images were created
✅ **Complete metadata** - S3 URLs, prompts, timestamps, sizes

## Files Created

- `src/training_data_sync.py` - S3 sync engine
- `src/training_data_api.py` - API for frontend integration
- `examples/auto_initialize_manifest_example.py` - Usage example

---

**The manifest is now automatically created and synced when you open the training data tab!** 🎯
