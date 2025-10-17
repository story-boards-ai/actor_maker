# Training Data Manifest Migration - Summary

## What Was Done

### 1. ✅ Created Sync Script
**File**: `scripts/sync_training_data_to_manifests.py`

This script:
- Scans all actor `training_data` folders for images
- Extracts S3 URLs from legacy `response.json` files (before deleting them)
- Calculates MD5 hashes for all local training images
- Updates actor manifests with complete training data information
- Deletes legacy `response.json` files
- Determines sync status for each image

### 2. ✅ Updated API Endpoint
**File**: `ui/config/routes/actors-api.ts`

Changes to `handleGetTrainingData()`:
- **Removed**: Legacy code that read from `response.json`
- **Removed**: Legacy styles implementation (not needed for actors)
- **Changed**: Now reads from manifests as the source of truth
- **Added**: Detection of orphaned local files (not in manifest)
- **Added**: Real-time hash comparison for sync status
- **Added**: Comprehensive sync statistics

### 3. ✅ Created Documentation
**Files**:
- `TRAINING_DATA_MANIFEST_SYSTEM.md` - Complete system documentation
- `MANIFEST_MIGRATION_SUMMARY.md` - This file

## Key Changes

### Before (Legacy System)
```
Training Data Tab → API → response.json → Shows 12 images
                                        (missing 5 local files)
```

### After (Manifest System)
```
Training Data Tab → API → Manifest → Shows ALL 17 images
                                   (local + S3, with sync status)
```

## What You Need to Do

### Step 1: Run the Sync Script

```bash
cd /home/markus/actor_maker
python3 scripts/sync_training_data_to_manifests.py
```

This will:
- Process all 289 actors
- Update all manifests with training data
- Delete all `response.json` files
- Show you a complete summary

### Step 2: Verify in UI

1. Open the Training Data tab for actor 0000
2. You should now see **all 17 images** instead of just 12
3. Each image will show its sync status:
   - 🟢 **synced**: File exists locally and in S3, hashes match
   - 🔵 **local_only**: File exists locally but not in S3
   - 🟡 **s3_only**: File exists in S3 but not locally
   - 🔴 **out_of_sync**: File exists in both but hashes don't match

### Step 3: Review Statistics

The API response now includes:
- `total_count`: Total number of training images
- `synced_count`: Images that are synced between local and S3
- `local_only_count`: Images only on local disk
- `s3_only_count`: Images only in S3
- `out_of_sync_count`: Images that exist in both but have different hashes

## Example: Actor 0000

### Before Migration
- **Visible in UI**: 12 images (from response.json)
- **Actually in folder**: 17 images
- **Missing from UI**: 5 images (0, 1, 2, 3, and duplicate 4.jpg)

### After Migration
- **Visible in UI**: 17 images (from manifest)
- **Sync Status**:
  - 12 images: `synced` (have S3 URLs)
  - 5 images: `local_only` (no S3 URLs)

## Benefits

1. **Complete Visibility**: See ALL training images, not just those in response.json
2. **Single Source of Truth**: Manifests contain everything
3. **Sync Awareness**: Know exactly what's synced and what's not
4. **Clean Architecture**: No more legacy response.json files
5. **Orphan Detection**: Find local files not tracked anywhere
6. **Hash Verification**: Detect file corruption or changes

## File Structure

### Manifest Training Data Section
```json
{
  "training_data": [
    {
      "filename": "0000_european_16_male_0.jpg",
      "local_path": "data/actors/0000_european_16_male/training_data/...",
      "size_bytes": 328059,
      "size_mb": 0.31,
      "md5_hash": "abc123...",
      "s3_url": "https://...",
      "status": "synced"
    }
  ],
  "training_data_updated": "2025-10-17T16:30:00",
  "statistics": {
    "training_images_count": 17,
    "training_synced_count": 12,
    "training_local_only_count": 5
  }
}
```

## Next Steps (Optional)

After running the sync script, you could:

1. **Add S3 Upload**: Create functionality to upload `local_only` images to S3
2. **Add S3 Download**: Create functionality to download `s3_only` images locally
3. **Add Sync Repair**: Re-upload `out_of_sync` images to fix hash mismatches
4. **Add Bulk Operations**: Sync all actors at once

## Rollback (If Needed)

If you need to rollback:
1. The sync script doesn't delete any image files, only `response.json`
2. Manifests are backed up (you can restore from git)
3. You can regenerate response.json files if needed (though not recommended)

## Questions?

- **Q**: Will this break existing training?
- **A**: No, training processes don't use response.json or manifests

- **Q**: What if I add new training images?
- **A**: Run the sync script again to update manifests

- **Q**: Can I still use the old system?
- **A**: No, the API has been updated to only read from manifests

## Summary

✅ **Script Created**: `sync_training_data_to_manifests.py`
✅ **API Updated**: Now reads from manifests
✅ **Legacy Code Removed**: No more response.json dependencies
✅ **Documentation Complete**: Full system documentation provided

**Action Required**: Run the sync script to complete the migration!
