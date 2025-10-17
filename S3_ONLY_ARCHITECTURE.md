# S3-Only Training Data Architecture

## Overview

Training data now exists **only in S3**. No local copies. This simplifies the architecture and eliminates sync complexity.

## Key Changes

### ✅ What Changed

1. **Deleted all local training data files** (1,699 files removed)
2. **S3 is the single source of truth** - No more local/S3 sync
3. **Simplified UI** - Removed all sync buttons (Sync, Sync from S3, Sync to S3)
4. **Simplified manifest** - Only tracks S3 URLs, no local paths or sync status
5. **Fast loading** - No local file scanning, just read manifest

### ❌ What Was Removed

- Local training data files (`data/actors/*/training_data/*.{png,jpg,jpeg}`)
- Sync buttons (🔄 Sync, ⬇️ Sync from S3, ⬆️ Sync to S3)
- Sync status tracking (synced, local_only, s3_only, out_of_sync)
- MD5 hash calculations
- Local/S3 comparison logic
- Comprehensive sync script functionality

## Architecture

### Manifest Structure

**Location**: `data/actor_manifests/{actor_id}_manifest.json`

**Structure** (simplified):
```json
{
  "character_id": "0042",
  "character_name": "0042_european_30_male",
  "training_data": [
    {
      "filename": "0042_european_30_male_0.jpg",
      "s3_url": "https://story-boards-assets.s3.../0042_european_30_male_0.jpg",
      "size_mb": 0.31,
      "modified_date": "2025-10-17T15:57:00.000000"
    }
  ],
  "training_data_updated": "2025-10-17T16:30:00.000000",
  "statistics": {
    "training_images_count": 17,
    "training_data_size_mb": 5.0
  }
}
```

### S3 Storage

**Bucket**: `story-boards-assets`

**Path**: `system_actors/training_data/{actor_name}/{filename}`

**Example**:
```
system_actors/training_data/0042_european_30_male/0042_european_30_male_0.jpg
system_actors/training_data/0042_european_30_male/0042_european_30_male_1.jpg
...
```

## API Endpoint

### GET `/api/actors/:actorId/training-data`

Returns training data from manifest (S3 URLs only).

**Response**:
```json
{
  "actor_id": 42,
  "actor_name": "0042_european_30_male",
  "training_images": [
    {
      "index": 0,
      "filename": "0042_european_30_male_0.jpg",
      "s3_url": "https://...",
      "size_mb": 0.31,
      "modified_date": "2025-10-17T15:57:00.000Z",
      "good": true
    }
  ],
  "base_image_path": "/data/actors/0042_european_30_male/base_image/0042_european_30_male_base.png",
  "total_count": 17,
  "manifest_updated": "2025-10-17T16:30:00.000Z"
}
```

**Note**: No `local_exists`, `local_path`, `status`, or sync counts.

## UI Changes

### Training Data Manager

**Before**:
- 🔄 Sync button
- ⬇️ Sync from S3 button
- ⬆️ Sync to S3 button
- Status badges (💾 Local, ☁️ S3 Only)
- Sync counts in header

**After**:
- ✨ Generate Single Image button
- 🎨 Generate All Prompts button
- 🗑️ Delete All button
- Grid size controls
- Simple count: "X images in S3"

### Image Display

Images are displayed directly from S3 URLs. No local file checks.

## Benefits

✅ **Simpler architecture** - One source of truth  
✅ **No sync complexity** - No local/S3 coordination  
✅ **Faster loading** - No local file scanning  
✅ **Less storage** - No local copies (saved ~2GB)  
✅ **Cleaner UI** - Removed confusing sync buttons  
✅ **Less code** - Removed sync logic and scripts  

## Python Functions

### Core Functions (Still Used)

- **`TrainingDataManifest`** (`src/training_data_manifest.py`)
  - `get_all_images()` - Get S3 URLs from manifest
  - `add_image()` - Add S3 URL to manifest
  - `remove_image()` - Remove from manifest

### Deprecated Functions (No Longer Used)

- ~~`TrainingDataSync.sync_actor_training_data()`~~ - No longer needed
- ~~`comprehensive_sync_training_data.py`~~ - Obsolete
- ~~`sync_actor_training_from_s3.py`~~ - Obsolete
- ~~`sync_actor_training_to_s3.py`~~ - Obsolete

## Migration

### What Happened

1. **Deleted local files**: All 1,699 local training images removed
2. **Updated API**: Returns S3 URLs only from manifest
3. **Updated UI**: Removed sync buttons and status badges
4. **Simplified manifest**: Removed local paths and sync status

### What Still Works

✅ **Viewing training data** - Shows S3 images  
✅ **Generating new images** - Uploads directly to S3  
✅ **Deleting images** - Removes from S3 and manifest  
✅ **Toggle good/bad status** - Via prompt_metadata.json  

## Console Logs

New logging format:
```
[S3-ONLY] Loading training data for actor 0042
[S3-ONLY] Loading manifest from data/actor_manifests/0042_manifest.json
[S3-ONLY] Found 17 images in manifest
[S3-ONLY] Returning 17 S3 images
```

## Summary

The training data system is now **S3-only**:

1. **No local files** - Training images only in S3
2. **No sync buttons** - S3 is the single source
3. **Simpler manifest** - Only S3 URLs tracked
4. **Faster loading** - No local file scanning
5. **Cleaner UI** - Removed sync complexity

This is a much cleaner and simpler architecture!
