# Comprehensive Sync Feature

## Overview

Added a simple **🔄 Sync** button to the Training Data tab that performs a comprehensive audit and synchronization of all training data for an actor.

## What It Does

The comprehensive sync performs a complete audit and brings everything in line:

1. **Audits the manifest** - Checks what files are tracked
2. **Audits local files** - Scans `data/actors/{actor_name}/training_data/`
3. **Audits S3 files** - Lists all files in S3 bucket
4. **Compares everything** - Identifies discrepancies
5. **Syncs automatically**:
   - **Uploads** local-only files to S3
   - **Downloads** S3-only files to local
   - **Adds** untracked files to manifest
   - **Updates** manifest with changed file hashes
   - **Removes** manifest entries for missing files

## UI Changes

### New Button
- **Location**: First button in the Training Data Manager header
- **Appearance**: Green button with 🔄 icon
- **Label**: "Sync"
- **Tooltip**: "Audit manifest, local files, and S3, then sync everything"

### Button Behavior
- Disabled while syncing (shows spinner and progress message)
- Shows detailed success message with counts
- Auto-reloads training data after sync
- Clears message after 5 seconds

## Backend Implementation

### New Python Script
**`scripts/comprehensive_sync_training_data.py`**

Features:
- Complete audit of manifest, local files, and S3
- MD5 hash verification
- Automatic upload/download/update operations
- Detailed logging and progress reporting
- Optional `--dry-run` mode for testing
- Optional `--delete-orphans` flag

### New API Endpoint
**`POST /api/actors/:actorId/training-data/comprehensive-sync`**

Request body:
```json
{
  "actor_name": "0042_european_30_male",
  "delete_orphans": false,
  "dry_run": false
}
```

Response:
```json
{
  "uploaded": 5,
  "downloaded": 3,
  "added_to_manifest": 2,
  "updated_in_manifest": 1,
  "removed_from_manifest": 0,
  "deleted_local": 0,
  "deleted_s3": 0,
  "errors": []
}
```

## Files Modified

### Frontend
- `ui/src/components/ActorTrainingDataManager/ActorTrainingDataManager.tsx`
  - Added `comprehensiveSync()` function
  - Added green "🔄 Sync" button

### Backend
- `ui/config/routes/actors/training-data.handlers.ts`
  - Added `handleComprehensiveSync()` handler
  
- `ui/config/routes/actors/index.ts`
  - Registered comprehensive-sync route

### Scripts
- `scripts/comprehensive_sync_training_data.py` (NEW)
  - Complete sync implementation

## Usage

### From UI
1. Open Training Data tab for any actor
2. Click the green **🔄 Sync** button
3. Wait for sync to complete
4. View updated training data

### From Command Line
```bash
# Basic sync
python3 scripts/comprehensive_sync_training_data.py 0042 0042_european_30_male

# Dry run (see what would be done)
python3 scripts/comprehensive_sync_training_data.py 0042 0042_european_30_male --dry-run

# Delete orphaned files not in manifest
python3 scripts/comprehensive_sync_training_data.py 0042 0042_european_30_male --delete-orphans
```

## Benefits

✅ **One-click sync** - No need to manually choose upload/download  
✅ **Comprehensive** - Audits all three sources (manifest, local, S3)  
✅ **Automatic** - Determines what needs to be done and does it  
✅ **Safe** - Doesn't delete files by default (orphans preserved)  
✅ **Transparent** - Shows exactly what was done  
✅ **Manifest integrity** - Ensures manifest is always accurate  

## Comparison with Old Buttons

| Feature | Old Buttons | New Sync Button |
|---------|-------------|-----------------|
| **User action** | Choose upload or download | Just click sync |
| **Scope** | One direction only | Bidirectional |
| **Manifest** | May get out of sync | Always updated |
| **Orphans** | Ignored | Detected and handled |
| **Hash verification** | No | Yes |
| **Audit** | No | Full audit |

## Safety Features

- **No deletions by default** - Orphaned files are preserved
- **Hash verification** - Ensures file integrity
- **Error handling** - Continues on errors, reports at end
- **Dry run mode** - Test without making changes
- **Detailed logging** - See exactly what happens

## Future Enhancements

Potential improvements:
- Progress bar during sync
- Selective sync (choose which files)
- Conflict resolution UI
- Automatic periodic sync
- Sync history/log viewer
