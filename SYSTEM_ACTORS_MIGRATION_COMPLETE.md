# System Actors Data Migration - Complete

**Date:** October 15, 2025  
**Source:** `/Users/markusetter/projects/storyboards_ai/system_actors`  
**Target:** `/Users/markusetter/projects/storyboards_ai/actor_maker`

## Summary

Successfully migrated all actor data from `system_actors` repository to `actor_maker`, including:
- ✅ Actor metadata (characters.json)
- ✅ Training data URLs and metadata
- ✅ Poster frame URLs (multiple sizes and formats)
- ✅ LoRA model URLs

## Migration Statistics

- **Total Actors:** 287
- **Training Data Folders:** 287
- **Poster Frame Folders:** 287
- **Total Training Files:** 419 (JSON metadata)
- **Total Poster Files:** 287 (JSON URLs)
- **Failed:** 0

## Data Structure

### Source (system_actors)

```
system_actors/
├── characters.json                    # Master registry with S3 URLs
└── characters/
    └── {id}_{ethnicity}_{age}_{sex}/
        ├── training_data/
        │   ├── request.json          # Training generation request
        │   └── response.json         # S3 URLs for training images
        └── poster_frame/
            └── {name}_poster_urls.json  # S3 URLs for poster frames
```

### Target (actor_maker)

```
actor_maker/
├── data/
│   ├── actorsData.json               # Copied from characters.json
│   ├── actorsData.ts                 # TypeScript version for UI
│   └── actors/
│       └── {id}_{ethnicity}_{age}_{sex}/
│           ├── base_image/           # From wm-characters migration
│           ├── training_data/        # From system_actors
│           │   ├── request.json
│           │   └── response.json
│           └── poster_frame/         # From system_actors
│               └── {name}_poster_urls.json
```

## Actor Data Format

Each actor in `actorsData.json` contains:

```json
{
  "id": 0,
  "img": "0000_european_16_male.webp",
  "age": "16",
  "sex": "male",
  "ethnicity": "european",
  "face_prompt": "16 year old young man...",
  "name": "0000_european_16_male",
  "outfit": "Casual high school attire...",
  "description": "16 year old young man...",
  "url": "https://story-boards-assets.s3-accelerate.amazonaws.com/system_actors/lora_models/0000.safetensors",
  "poster_frames": {
    "standard": {
      "webp_sm": "https://story-boards-assets.s3.us-west-1.amazonaws.com/system_actors/poster_frames/0000_european_16_male_poster_sm.webp",
      "webp_md": "https://story-boards-assets.s3.us-west-1.amazonaws.com/system_actors/poster_frames/0000_european_16_male_poster_md.webp",
      "webp_lg": "https://story-boards-assets.s3.us-west-1.amazonaws.com/system_actors/poster_frames/0000_european_16_male_poster_lg.webp",
      "png": "https://story-boards-assets.s3.us-west-1.amazonaws.com/system_actors/poster_frames/0000_european_16_male_poster.png"
    },
    "accelerated": {
      "webp_sm": "https://story-boards-assets.s3-accelerate.amazonaws.com/system_actors/poster_frames/0000_european_16_male_poster_sm.webp",
      "webp_md": "https://story-boards-assets.s3-accelerate.amazonaws.com/system_actors/poster_frames/0000_european_16_male_poster_md.webp",
      "webp_lg": "https://story-boards-assets.s3-accelerate.amazonaws.com/system_actors/poster_frames/0000_european_16_male_poster_lg.webp",
      "png": "https://story-boards-assets.s3-accelerate.amazonaws.com/system_actors/poster_frames/0000_european_16_male_poster.png"
    }
  }
}
```

## Training Data Format

Each `training_data/response.json` contains S3 URLs for training images:

```json
{
  "output": {
    "actor_id": "0000_european_16_male",
    "job_id": "0e478329-9504-492f-a19b-c387dd969193",
    "s3_image_urls": [
      "https://story-boards-assets.s3.us-west-1.amazonaws.com/system_actors/training_data/0000_european_16_male/0000_european_16_male_0.png",
      "https://story-boards-assets.s3.us-west-1.amazonaws.com/system_actors/training_data/0000_european_16_male/0000_european_16_male_1.png",
      ...
      "https://story-boards-assets.s3.us-west-1.amazonaws.com/system_actors/training_data/0000_european_16_male/0000_european_16_male_13.png"
    ],
    "type": "system",
    "user_id": "99999999-9999-9999-9999-999999999999"
  },
  "status": "success"
}
```

Typically **14 training images** per actor.

## S3 Storage Locations

### LoRA Models
- **Bucket:** `story-boards-assets`
- **Path:** `system_actors/lora_models/{id}.safetensors`
- **Example:** `system_actors/lora_models/0000.safetensors`

### Training Data
- **Bucket:** `story-boards-assets`
- **Path:** `system_actors/training_data/{name}/{name}_{index}.png`
- **Example:** `system_actors/training_data/0000_european_16_male/0000_european_16_male_0.png`

### Poster Frames
- **Bucket:** `story-boards-assets`
- **Path:** `system_actors/poster_frames/{name}_poster[_size].{format}`
- **Sizes:** `sm`, `md`, `lg`, or full (no suffix)
- **Formats:** `webp`, `png`
- **Example:** `system_actors/poster_frames/0000_european_16_male_poster_md.webp`

## Git Configuration

Created `.gitignore` in `data/actors/` to exclude binary files:

```gitignore
# Ignore all image and binary files
*.png
*.jpg
*.jpeg
*.webp
*.safetensors

# Keep JSON metadata files
!*.json

# Keep directory structure
!.gitkeep
```

This ensures:
- ✅ JSON metadata is tracked in Git
- ✅ Directory structure is preserved
- ❌ Large binary files (images, models) are excluded

## Key Differences from wm-characters

| Feature | wm-characters | system_actors | actor_maker |
|---------|---------------|---------------|-------------|
| **Data Storage** | Local files only | S3 URLs in JSON | Both (local + S3 URLs) |
| **Training Data** | Not tracked | S3 URLs + metadata | Copied from system_actors |
| **Poster Frames** | Shared by gender | Per-actor, multiple sizes | Copied from system_actors |
| **LoRA Files** | Not tracked | S3 URLs | URLs from system_actors |
| **Metadata Format** | Simple JSON | Rich JSON with URLs | TypeScript + JSON |

## Next Steps

1. **Update UI Components**
   - ✅ `ActorCard.tsx` - Already updated to use Actor type
   - ✅ `ActorsGrid.tsx` - Already updated to load from actorsData.ts
   - ⏳ Add poster frame display
   - ⏳ Add training data viewer

2. **Create S3 Sync Tools**
   - Download training images from S3
   - Download poster frames from S3
   - Verify LoRA model availability

3. **Update Type Definitions**
   - ✅ Actor interface already has poster_frames
   - ⏳ Add training data types
   - ⏳ Add LoRA model types

## Verification

To verify the migration:

```bash
# Check actor count
ls data/actors/ | wc -l
# Should show: 287

# Check a specific actor
ls -la data/actors/0000_european_16_male/
# Should show: base_image/, training_data/, poster_frame/

# Check training data
cat data/actors/0000_european_16_male/training_data/response.json | jq '.output.s3_image_urls | length'
# Should show: 14 (typically)

# Check poster frames
cat data/actors/0000_european_16_male/poster_frame/0000_european_16_male_poster_urls.json | jq '.standard | keys'
# Should show: ["png", "webp_lg", "webp_md", "webp_sm"]
```

## Migration Script

The migration was performed using:
```bash
python3 scripts/copy_from_system_actors.py
```

This script:
1. Copies `characters.json` → `data/actorsData.json`
2. Generates TypeScript version → `data/actorsData.ts`
3. Copies all `training_data/` folders
4. Copies all `poster_frame/` folders
5. Creates `.gitignore` and `.gitkeep` files

## Success Criteria

✅ All 287 actors migrated  
✅ All training data metadata copied  
✅ All poster frame URLs copied  
✅ TypeScript data file generated  
✅ Git configuration created  
✅ Directory structure preserved  
✅ Zero failures during migration  

---

**Migration Status:** ✅ **COMPLETE**
