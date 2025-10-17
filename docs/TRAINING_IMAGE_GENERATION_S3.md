# Training Image Generation - S3-Only Architecture

## Overview

The training image generation system has been updated to work with the S3-only architecture. Images are no longer stored locally - they are downloaded from S3, processed, and uploaded directly back to S3, with manifests updated accordingly.

## Architecture Changes

### Before (Dual Storage)
1. Base image stored locally
2. Generated images saved locally
3. Manual sync to S3
4. Local files as source of truth

### After (S3-Only)
1. Base image downloaded from S3 URL (from manifest)
2. Generated images uploaded directly to S3
3. No local storage (except temporary during processing)
4. Manifest updated with new training images
5. S3 is the single source of truth

## Key Components

### Python Scripts

#### 1. `generate_all_prompt_images_s3.py`
Generates one training image for each available prompt using S3-only architecture.

**Location**: `/scripts/training_data/generate_all_prompt_images_s3.py`

**Usage**:
```bash
python3 generate_all_prompt_images_s3.py <actor_id> <actor_name> <base_image_url> [actor_type] [actor_sex]
```

**Example**:
```bash
python3 generate_all_prompt_images_s3.py 0012 0012_european_30_male https://story-boards-assets.s3.us-west-1.amazonaws.com/system_actors/base_images/0012_european_30_male_base.jpg person male
```

**Features**:
- Downloads base image from S3 URL
- Generates images using Replicate flux-kontext-pro
- Uploads directly to S3 (no local save)
- Updates actor manifest with new images
- Saves prompt metadata for UI
- Handles concurrency with file-based locking

#### 2. `generate_single_training_image_s3.py`
Generates a single training image with custom prompt using S3-only architecture.

**Location**: `/scripts/training_data/generate_single_training_image_s3.py`

**Usage**:
```bash
python3 generate_single_training_image_s3.py <actor_id> <actor_name> <base_image_url> <prompt> [actor_type] [actor_sex]
```

**Example**:
```bash
python3 generate_single_training_image_s3.py 0012 0012_european_30_male https://story-boards-assets.s3.us-west-1.amazonaws.com/.../base.jpg "A person in a dramatic scene" person male
```

**Features**:
- Downloads base image from S3 URL
- Generates single image with custom prompt
- Uploads directly to S3
- Updates actor manifest
- Saves prompt metadata

### Backend Handlers

#### Updated Handlers
**File**: `/ui/config/routes/actors/image-generation.handlers.ts`

**Changes**:
1. `handleGenerateAllPromptImages`: Now calls `generate_all_prompt_images_s3.py`
2. `handleGenerateSingleTrainingImage`: Now calls `generate_single_training_image_s3.py`

**Key Updates**:
- Pass `actorId` to Python scripts for manifest updates
- Use `base_image_url` from manifest (S3 URL)
- Scripts handle S3 upload and manifest updates

### Frontend Integration

The frontend already passes `base_image_url` from the manifest:

**File**: `/ui/src/hooks/useTrainingDataManager/useImageGeneration.ts`

**API Call**:
```typescript
const response = await fetch('/api/training-data/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    images: imageData,
    workflow,
    settings: generationSettings,
    styleId: actor.id.toString(),
    // ... other params
  })
});
```

## Manifest Updates

### Structure
When new training images are generated, the manifest is automatically updated:

```json
{
  "character_id": "0012",
  "training_data": [
    {
      "filename": "0012_european_30_male_14.jpg",
      "s3_url": "https://story-boards-assets.s3.us-west-1.amazonaws.com/system_actors/training_data/0012_european_30_male/0012_european_30_male_14.jpg",
      "md5_hash": "f97dfc185bd7a21c66d9a0a63e167191",
      "size_bytes": 799211,
      "size_mb": 0.76,
      "modified_timestamp": 1760621647.1895244,
      "modified_date": "2025-10-16T15:34:07.189524",
      "status": "synced"
    }
  ],
  "statistics": {
    "training_images_count": 17,
    "training_synced_count": 17
  },
  "training_data_updated": "2025-10-17T16:46:12.330110"
}
```

### Update Process
1. Script generates image
2. Uploads to S3
3. Reads manifest file
4. Appends new image entry to `training_data` array
5. Updates statistics
6. Updates `training_data_updated` timestamp
7. Saves manifest

## Data Flow

### Generate All Prompts
```
Frontend (useImageGeneration)
  ↓
POST /api/actors/:actorId/training-data/generate-all-prompts
  ↓
handleGenerateAllPromptImages
  ↓
generate_all_prompt_images_s3.py
  ↓
1. Download base image from S3
2. For each prompt:
   - Generate with Replicate
   - Upload to S3
   - Update manifest
   - Save metadata
  ↓
Return results to frontend
```

### Generate Single Image
```
Frontend (useImageGeneration)
  ↓
POST /api/actors/:actorId/training-data/generate-single
  ↓
handleGenerateSingleTrainingImage
  ↓
generate_single_training_image_s3.py
  ↓
1. Download base image from S3
2. Generate with Replicate
3. Upload to S3
4. Update manifest
5. Save metadata
  ↓
Return result to frontend
```

## Benefits

### 1. **Simplified Architecture**
- No dual storage management
- No sync operations needed
- Single source of truth (S3)

### 2. **Consistency**
- Manifest always reflects S3 state
- No local/S3 mismatches
- Automatic metadata tracking

### 3. **Scalability**
- Works across multiple machines
- No local disk space requirements
- Cloud-native approach

### 4. **Reliability**
- Manifest updated after each successful upload
- Progress preserved even if script crashes
- Atomic operations per image

## Environment Variables

Required environment variables:

```bash
# S3 Bucket for system actors
AWS_SYSTEM_ACTORS_BUCKET=story-boards-assets

# AWS Credentials (from environment or ~/.aws/credentials)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=us-west-1

# Replicate API
REPLICATE_API_TOKEN=...
```

## Error Handling

### Script Errors
- Each image generation is independent
- Failed images don't block subsequent ones
- Errors logged with details
- Manifest only updated for successful uploads

### Manifest Updates
- Manifest loaded before each update
- Atomic write operations
- Error logged if manifest update fails
- Script continues even if manifest update fails

### Network Issues
- Retry logic in Replicate service
- Timeout protection (30s for downloads)
- Graceful degradation

## Migration Notes

### Old Scripts (Deprecated)
- `scripts/generate_all_prompt_images.py` - Uses local storage
- `scripts/generate_single_training_image.py` - Uses local storage

### New Scripts (Current)
- `scripts/training_data/generate_all_prompt_images_s3.py` - S3-only
- `scripts/training_data/generate_single_training_image_s3.py` - S3-only

### Breaking Changes
None - the API interface remains the same. Frontend code doesn't need changes.

## Testing

### Test Single Image Generation
```bash
cd /Users/markusetter/projects/storyboards_ai/actor_maker

python3 scripts/training_data/generate_single_training_image_s3.py \
  0012 \
  0012_european_30_male \
  "https://story-boards-assets.s3.us-west-1.amazonaws.com/system_actors/base_images/0012_european_30_male_base.jpg" \
  "A person standing in a dramatic scene with cinematic lighting" \
  person \
  male
```

### Test All Prompts Generation
```bash
cd /Users/markusetter/projects/storyboards_ai/actor_maker

python3 scripts/training_data/generate_all_prompt_images_s3.py \
  0012 \
  0012_european_30_male \
  "https://story-boards-assets.s3.us-west-1.amazonaws.com/system_actors/base_images/0012_european_30_male_base.jpg" \
  person \
  male
```

### Verify Manifest Update
```bash
cat data/actor_manifests/0012_manifest.json | jq '.training_data | length'
cat data/actor_manifests/0012_manifest.json | jq '.training_data_updated'
```

## Troubleshooting

### Issue: "Failed to download base image"
- **Cause**: Invalid S3 URL or network issue
- **Solution**: Verify base_image_url in manifest, check AWS credentials

### Issue: "Failed to update manifest"
- **Cause**: Manifest file permissions or JSON parsing error
- **Solution**: Check file permissions, verify manifest JSON structure

### Issue: "Could not acquire request slot"
- **Cause**: Too many concurrent requests
- **Solution**: Wait for existing requests to complete, or increase MAX_CONCURRENT_REQUESTS

### Issue: Images generated but not showing in UI
- **Cause**: Manifest not updated or cache issue
- **Solution**: Refresh UI, verify manifest contains new images, check S3 URLs

## Future Enhancements

1. **Batch Upload Optimization**: Upload multiple images in parallel
2. **Progress Streaming**: Real-time progress updates via WebSocket
3. **Resume Support**: Resume interrupted generation sessions
4. **Image Validation**: Verify image quality before adding to manifest
5. **Automatic Cleanup**: Remove failed/incomplete uploads from S3
