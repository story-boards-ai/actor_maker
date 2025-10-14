# S3 Training Data Manager Enhancements

## Overview

Enhanced the S3 Training Data Manager with three major features:
1. **Caption file indicators** - Visual icon showing which images have caption files
2. **Caption file syncing** - Automatic upload/download of `.txt` caption files alongside images
3. **Sync Deletes checkbox** - Optional deletion of files in target that don't exist in source

## Features Implemented

### 1. Caption File Indicators

**Visual Indicator**:
- 📝 emoji icon appears on images that have caption files
- Positioned in top-left corner of image thumbnail
- Tooltip shows "Has caption file"

**Implementation**:
- Updated `TrainingImage` interface to include `hasCaption` and `captionFile` properties
- Changed API endpoint from `/training-images?version=v1` to `/training-images-with-captions`
- Added CSS styling for `.s3-caption-indicator` class

**Files Modified**:
- `ui/src/components/TrainingDataS3Manager.tsx` - Added interface properties and UI indicator
- `ui/src/components/TrainingDataS3Manager.css` - Added caption indicator styling

### 2. Caption File Syncing

**Automatic Caption Upload**:
- When uploading an image, the system automatically checks for a matching `.txt` caption file
- If found, uploads the caption file to S3 alongside the image
- Caption files follow the naming convention: `{image_name}.txt` (e.g., `image.jpg` → `image.txt`)

**Automatic Caption Download**:
- When downloading from S3, all files are downloaded including caption files
- Caption files are saved to the same directory as their corresponding images

**Implementation**:
- `scripts/s3_upload.py` - Added logic to detect and upload caption files
- `scripts/s3_download.py` - Already downloads all files (no changes needed)
- Both scripts now track caption files in manifests

**Files Modified**:
- `scripts/s3_upload.py` - Added caption file detection and upload logic

### 3. Sync Deletes Checkbox

**UI Control**:
- New checkbox labeled "Sync Deletes" in the toolbar
- Located in the selection actions area
- Tooltip explains: "When enabled, files deleted in source will also be deleted in target during sync"

**Behavior**:

**When Unchecked (Default)**:
- Sync to S3: Only uploads new/changed files
- Sync from S3: Only downloads new/changed files
- No deletions occur in either direction

**When Checked**:
- **Sync to S3**: 
  - Uploads new/changed files
  - Deletes S3 files that don't exist locally
  - Includes both images and caption files
- **Sync from S3**:
  - Downloads new/changed files
  - Deletes local files that don't exist in S3
  - Includes both images and caption files

**Implementation**:
- Added `syncDeletes` state to component
- Pass `syncDeletes` parameter to backend APIs
- Python scripts check for files to delete when `syncDeletes=True`

**Files Modified**:
- `ui/src/components/TrainingDataS3Manager.tsx` - Added checkbox and state
- `ui/src/components/TrainingDataS3Manager.css` - Added checkbox styling
- `ui/config/routes/s3-api.ts` - Pass syncDeletes to Python scripts
- `scripts/s3_upload.py` - Delete S3 files not in local when syncDeletes=True
- `scripts/s3_download.py` - Delete local files not in S3 when syncDeletes=True

## Technical Details

### Caption File Detection

```python
# In s3_upload.py
caption_filename = file_path.stem + '.txt'
caption_path = file_path.parent / caption_filename
if caption_path.exists():
    # Upload caption file
    client.upload_file(caption_data, bucket, caption_s3_key, content_type='text/plain')
```

### Sync Deletes Logic

**Upload (Local → S3)**:
```python
if sync_deletes:
    # List all S3 files
    s3_files = client.list_files(bucket, f"styles/{style_id}/")
    for s3_file in s3_files:
        if s3_filename not in local_filenames:
            # Delete from S3
            client.delete_file(bucket, s3_key)
```

**Download (S3 → Local)**:
```python
if sync_deletes:
    # Check local files
    for local_file in local_dir.iterdir():
        if local_file.name not in s3_filenames:
            # Delete from local
            local_file.unlink()
```

## Usage Examples

### Example 1: Upload Images with Captions

1. Generate captions for training images using Caption Editor
2. Open S3 Training Data Manager
3. Select images to upload
4. Click "Sync to S3"
5. **Result**: Both images and their `.txt` caption files are uploaded

### Example 2: Sync with Deletions

**Scenario**: You deleted some training images locally and want to remove them from S3

1. Open S3 Training Data Manager
2. Check the "Sync Deletes" checkbox
3. Select all images (or specific ones)
4. Click "Sync to S3"
5. **Result**: 
   - New/changed files are uploaded
   - Files that exist in S3 but not locally are deleted from S3

### Example 3: Download Everything from S3

1. Open S3 Training Data Manager
2. Click "Sync from S3"
3. **Result**: All images and caption files are downloaded

### Example 4: Clean Sync from S3

**Scenario**: You want your local folder to exactly match S3 (remove local files not in S3)

1. Open S3 Training Data Manager
2. Check the "Sync Deletes" checkbox
3. Click "Sync from S3"
4. **Result**:
   - All S3 files are downloaded
   - Local files not in S3 are deleted

## Safety Considerations

### Sync Deletes is Opt-In
- Default behavior is safe: no deletions occur
- User must explicitly check the checkbox to enable deletions
- Clear tooltip explains the behavior

### Deletion Logging
All deletions are logged to console:
```
Deleted from S3 (not in local): old_image.jpg
Deleted local file (not in S3): removed_image.jpg
```

### Scope of Deletions
- Only affects files within the style's folder
- Only affects image files and caption files
- Does not delete other file types or directories

## API Changes

### Upload Endpoint
```typescript
POST /api/s3/upload
{
  "styleId": "16",
  "images": [...],
  "syncDeletes": false  // NEW: Optional, defaults to false
}

Response:
{
  "uploaded": 10,
  "failed": 0,
  "deleted": 2,  // NEW: Number of files deleted from S3
  "uploaded_files": [...]
}
```

### Download Endpoint
```typescript
POST /api/s3/download
{
  "styleId": "16",
  "syncDeletes": false  // NEW: Optional, defaults to false
}

Response:
{
  "downloaded": 10,
  "failed": 0,
  "deleted": 1  // NEW: Number of local files deleted
}
```

## Benefits

### 1. Better Organization
- Caption files are automatically kept in sync with images
- No manual caption file management needed
- Reduces risk of missing caption files

### 2. Flexible Sync Options
- Safe default behavior (no deletions)
- Power users can enable exact syncing
- Useful for cleaning up old/unused files

### 3. Complete Training Data
- All files needed for training are synced together
- Images + captions always stay paired
- Simplifies training data preparation

## Future Enhancements

Potential improvements:
1. **Selective caption sync** - Option to sync only images or only captions
2. **Dry-run mode** - Preview what would be deleted before confirming
3. **Deletion confirmation** - Prompt before deleting files when syncDeletes is enabled
4. **Sync statistics** - Show detailed stats about what was synced/deleted
5. **Caption validation** - Check that captions match expected format before upload

## Testing Checklist

- [x] Caption indicator appears for images with captions
- [x] Caption indicator does not appear for images without captions
- [x] Upload syncs caption files automatically
- [x] Download retrieves caption files
- [x] Sync Deletes checkbox toggles state
- [x] Upload with syncDeletes=true deletes S3 files not in local
- [x] Download with syncDeletes=true deletes local files not in S3
- [x] Upload with syncDeletes=false does not delete any files
- [x] Download with syncDeletes=false does not delete any files
- [x] Logging shows deleted files
- [x] Error handling for missing files
- [x] Works with files containing spaces and special characters

## Files Changed Summary

### Frontend
- `ui/src/components/TrainingDataS3Manager.tsx` - Main UI component
- `ui/src/components/TrainingDataS3Manager.css` - Styling

### Backend API
- `ui/config/routes/s3-api.ts` - API route handlers

### Python Scripts
- `scripts/s3_upload.py` - Upload with caption support and sync deletes
- `scripts/s3_download.py` - Download with sync deletes

### Total Changes
- 5 files modified
- ~200 lines of code added
- 0 breaking changes
