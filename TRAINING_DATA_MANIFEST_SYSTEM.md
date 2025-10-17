# Training Data Manifest System

## Overview

The actor training data system now uses **manifests as the single source of truth** instead of legacy `response.json` files. This provides a unified view of training data across local files and S3.

## Architecture

### Source of Truth: Manifests

- **Location**: `data/actor_manifests/{actor_id}_manifest.json`
- **Contains**: Complete training data information including:
  - Filenames
  - Local paths
  - S3 URLs
  - MD5 hashes
  - File sizes
  - Sync status

### Legacy Files (Deprecated)

- ❌ `data/actors/{actor_name}/training_data/response.json` - **DELETED**
  - These files are no longer used
  - Run the sync script to migrate data and delete them

## Sync Script

### Purpose

The `sync_training_data_to_manifests.py` script:

1. **Scans** all actor training_data folders for images
2. **Extracts** S3 URLs from old response.json files (before deleting)
3. **Calculates** MD5 hashes for all local files
4. **Updates** manifests with complete training data information
5. **Deletes** legacy response.json files
6. **Determines** sync status (synced, local_only, s3_only, out_of_sync)

### Usage

```bash
# From project root
python3 scripts/sync_training_data_to_manifests.py
```

### Output

```
🔄 TRAINING DATA SYNC TO MANIFESTS
================================================================================

📁 Processing actor: 0000_european_16_male (ID: 0000)
  ✅ Found 17 training images
     📤 12 images have S3 URLs (synced)
     💾 5 images are local only
  🗑️  Deleted response.json
  ✅ Updated manifest

📊 SUMMARY
================================================================================
✅ Processed 289 actors
📸 Found 2,451 total training images
🗑️  Deleted 108 response.json files
📝 Updated 289 manifests
```

## API Endpoint

### GET `/api/actors/:actorId/training-data`

Returns complete training data information from the manifest.

**Response Structure:**

```json
{
  "actor_id": 0,
  "actor_name": "0000_european_16_male",
  "training_images": [
    {
      "index": 0,
      "filename": "0000_european_16_male_0.jpg",
      "s3_url": "https://story-boards-assets.s3.us-west-1.amazonaws.com/...",
      "local_exists": true,
      "local_path": "/data/actors/0000_european_16_male/training_data/0000_european_16_male_0.jpg",
      "md5_hash": "abc123...",
      "size_mb": 0.32,
      "modified_date": "2025-10-17T14:08:00.000Z",
      "status": "synced",
      "good": true
    }
  ],
  "base_image_path": "/data/actors/0000_european_16_male/base_image/0000_european_16_male_base.png",
  "total_count": 17,
  "synced_count": 12,
  "local_only_count": 5,
  "s3_only_count": 0,
  "out_of_sync_count": 0,
  "manifest_updated": "2025-10-17T16:30:00.000Z"
}
```

### Sync Status Values

- **`synced`**: File exists locally and in S3, hashes match
- **`local_only`**: File exists locally but not in S3
- **`s3_only`**: File exists in S3 but not locally
- **`out_of_sync`**: File exists in both but hashes don't match

## Training Data Tab UI

The Training Data tab now:

1. **Shows ALL images** from the manifest (not just S3 URLs)
2. **Displays sync status** for each image
3. **Detects orphaned files** (local files not in manifest)
4. **Shows complete counts**:
   - Total images
   - Synced images
   - Local-only images
   - S3-only images
   - Out-of-sync images

## Manifest Structure

### Training Data Section

```json
{
  "character_id": "0000",
  "character_name": "0000_european_16_male",
  "training_data": [
    {
      "filename": "0000_european_16_male_0.jpg",
      "local_path": "data/actors/0000_european_16_male/training_data/0000_european_16_male_0.jpg",
      "size_bytes": 328059,
      "size_mb": 0.31,
      "modified_timestamp": 1729176000.0,
      "modified_date": "2025-10-17T15:57:00.000000",
      "md5_hash": "abc123def456...",
      "s3_url": "https://story-boards-assets.s3.us-west-1.amazonaws.com/system_actors/training_data/0000_european_16_male/0000_european_16_male_0.jpg",
      "status": "synced"
    }
  ],
  "training_data_updated": "2025-10-17T16:30:00.000000",
  "statistics": {
    "training_images_count": 17,
    "training_data_size_bytes": 5242880,
    "training_data_size_mb": 5.0,
    "training_synced_count": 12,
    "training_local_only_count": 5
  }
}
```

## Migration Checklist

- [x] Create sync script
- [x] Update API to read from manifests
- [x] Remove legacy response.json dependencies
- [ ] Run sync script on all actors
- [ ] Verify Training Data tab shows all images
- [ ] Delete all response.json files
- [ ] Update any other code that reads response.json

## Benefits

1. **Single Source of Truth**: Manifests contain all training data info
2. **Complete Visibility**: See ALL training images (local + S3)
3. **Sync Status**: Know exactly what's synced and what's not
4. **Orphan Detection**: Find local files not tracked in manifest
5. **Hash Verification**: Detect when files are out of sync
6. **No Legacy Files**: Clean architecture without response.json clutter

## Future Enhancements

- Add S3 sync functionality (upload local_only files)
- Add download functionality (download s3_only files)
- Add hash repair (re-upload out_of_sync files)
- Add bulk operations (sync all, download all, etc.)
