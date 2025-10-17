# Training Data Management - S3-Only Architecture

## Core Principle

**S3 is the single source of truth for all actor training data.**

Training images exist **only in S3**. No local copies. The manifest tracks S3 URLs only.

## Manifest Location

```
data/actor_manifests/{actor_id}_manifest.json
```

Example: `data/actor_manifests/0042_manifest.json`

## Manifest Structure

```json
{
  "character_id": "0042",
  "character_name": "0042_european_30_male",
  "training_data": [
    {
      "filename": "0042_european_30_male_0.jpg",
      "local_path": "data/actors/0042_european_30_male/training_data/0042_european_30_male_0.jpg",
      "s3_url": "https://story-boards-assets.s3.us-west-1.amazonaws.com/system_actors/training_data/0042_european_30_male/0042_european_30_male_0.jpg",
      "md5_hash": "abc123def456...",
      "size_bytes": 328059,
      "size_mb": 0.31,
      "modified_timestamp": 1729176000.0,
      "modified_date": "2025-10-17T15:57:00.000000",
      "status": "synced"
    }
  ],
  "training_data_updated": "2025-10-17T16:30:00.000000",
  "statistics": {
    "training_images_count": 17,
    "training_data_size_mb": 5.0,
    "training_synced_count": 12,
    "training_local_only_count": 5,
    "training_s3_only_count": 0,
    "training_out_of_sync_count": 0
  }
}
```

## File Status Values

Each training image has a `status` field indicating its sync state:

- **`synced`**: File exists in both local and S3, MD5 hashes match
- **`local_only`**: File exists locally but not in S3
- **`s3_only`**: File exists in S3 but not locally
- **`out_of_sync`**: File exists in both but MD5 hashes don't match (needs re-sync)

## Storage Locations

### Local Storage
```
data/actors/{actor_name}/training_data/{actor_name}_{index}.jpg
```

### S3 Storage
```
Bucket: story-boards-assets
Path: system_actors/training_data/{actor_name}/{actor_name}_{index}.jpg
```

## Hash Verification

Every file has an MD5 hash calculated from its content. This hash:
- Verifies file integrity
- Detects when local and S3 versions differ
- Determines sync status
- Must be recalculated when file content changes

## Mutation Rules

### ✅ REQUIRED: Update Manifest on Every Change

**Adding a file:**
1. Upload to S3 or save locally
2. Calculate MD5 hash
3. Add entry to manifest `training_data` array
4. Set appropriate `status` (local_only, s3_only, or synced)
5. Update `training_data_updated` timestamp
6. Update statistics

**Deleting a file:**
1. Delete from S3 and/or local storage
2. Remove entry from manifest `training_data` array
3. Update `training_data_updated` timestamp
4. Update statistics

**Modifying a file:**
1. Update file in S3 and/or local storage
2. Recalculate MD5 hash
3. Update manifest entry with new hash and timestamp
4. Update `status` if sync state changed
5. Update `training_data_updated` timestamp

**Syncing files:**
1. Download from S3 → local or upload local → S3
2. Calculate MD5 hash of synced file
3. Update manifest entry with both paths and matching hash
4. Set `status` to "synced"
5. Update statistics

### ❌ NEVER: Mutate Without Updating Manifest

- Don't upload to S3 without updating manifest
- Don't save locally without updating manifest
- Don't delete files without updating manifest
- Don't modify files without recalculating hash

## API Endpoint

### GET `/api/actors/:actorId/training-data`

Returns complete training data from manifest:

```json
{
  "actor_id": 42,
  "actor_name": "0042_european_30_male",
  "training_images": [
    {
      "index": 0,
      "filename": "0042_european_30_male_0.jpg",
      "s3_url": "https://...",
      "local_exists": true,
      "local_path": "/data/actors/.../0042_european_30_male_0.jpg",
      "md5_hash": "abc123...",
      "size_mb": 0.31,
      "modified_date": "2025-10-17T14:08:00.000Z",
      "status": "synced"
    }
  ],
  "total_count": 17,
  "synced_count": 12,
  "local_only_count": 5,
  "s3_only_count": 0,
  "out_of_sync_count": 0
}
```

## Sync Scripts

### Sync Script (Manifest Update)
```bash
python3 scripts/sync_training_data_to_manifests.py
```

**Purpose**: Scan all actors, update manifests with current state of local files and S3 URLs.

### Bulk Download (S3 → Local)
```bash
./sync_all_training_data.sh
```

**Purpose**: Download all training images from S3 to local storage (updates manifests).

### Individual Actor Sync
```bash
# Download from S3
python3 scripts/sync_actor_training_from_s3.py <actor_name> '<s3_urls_json>'

# Upload to S3
python3 scripts/sync_actor_training_to_s3.py <actor_name>
```

## Accountability

**All files must be accounted for in the manifest:**

- Every training image file must have a manifest entry
- Orphaned files (local files not in manifest) should be detected and added
- Missing files (manifest entries without files) should be flagged
- Hash mismatches indicate files need re-sync

## Legacy Files (Deprecated)

❌ **`data/actors/{actor_name}/training_data/response.json`** - NO LONGER USED

These files have been migrated to manifests and should be deleted. The manifest system replaces them entirely.

## Python Functions

All training data operations **must** use these functions to ensure manifest consistency:

### Core Manifest Management
- **`TrainingDataManifest`** (`src/training_data_manifest.py`)
  - `add_generation()` - Add new training images to manifest
  - `add_image()` - Add individual image to manifest
  - `remove_image()` - Remove image from manifest
  - `update_image()` - Update image metadata
  - `get_all_images()` - Get all tracked images
  - `save()` - Persist manifest to disk

### S3 Synchronization
- **`TrainingDataSync`** (`src/training_data_sync.py`)
  - `auto_initialize_manifest()` - Scan S3 and create/update manifest
  - `sync_actor_training_data()` - Full sync between S3 and manifest

### API Layer
- **`TrainingDataAPI`** (`src/training_data_api.py`)
  - `get_training_data()` - Get training data (auto-initializes manifest)
  - `delete_training_image()` - Delete image from manifest and optionally S3
  - `upload_training_images()` - Upload images and update manifest

### Scripts
- **`scripts/sync_training_data_to_manifests.py`** - Bulk manifest sync for all actors
- **`scripts/sync_all_actors_training_data.py`** - Bulk S3 download with manifest updates

### ⚠️ CRITICAL: Always Use These Functions

**DO NOT:**
- Directly modify manifest JSON files
- Upload/delete S3 files without updating manifest
- Create/delete local files without updating manifest
- Calculate hashes manually

**DO:**
- Use `TrainingDataManifest` for all manifest operations
- Use `TrainingDataSync` for S3 operations
- Use `TrainingDataAPI` for frontend integration
- Let the system handle hashing automatically

## Summary

1. **Manifests are the single source of truth** - Always read from and write to manifests
2. **All mutations must update manifests** - No exceptions
3. **Files tracked by hash** - MD5 verification ensures integrity
4. **Files can exist in three states** - Local only, S3 only, or both (synced)
5. **Status field tracks sync state** - Always reflects current reality
6. **All files must be accounted for** - No orphaned or untracked files
7. **Use provided Python functions** - Never manipulate manifests directly

This system ensures complete visibility and control over all training data across local storage and S3.
