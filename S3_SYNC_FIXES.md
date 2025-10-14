# S3 Sync Fixes & Change Detection

## Issues Fixed

### 1. ✅ URL Encoding Problem (File Upload Failures)

**Problem**: Files with spaces in names were failing to upload with error:
```
File not found: resources/style_images/16_dynamic_simplicity/A%20Boy%20and%20a%20Girl_scene_1_shot_1%20(2).jpg
```

**Root Cause**: The `localPath` from the frontend had URL-encoded characters (`%20` for spaces) that weren't being decoded before checking file existence.

**Fix Applied**: Added URL decoding in `/ui/config/routes/s3-api.ts` line 140-142:
```python
import urllib.parse
local_path = img['localPath'].replace('/resources/', 'resources/')
local_path = urllib.parse.unquote(local_path)  # Decode %20 -> space, etc.
```

**Result**: Files with spaces, parentheses, and other special characters now upload correctly.

---

### 2. ✅ File Change Detection (New Feature)

**Problem**: No way to detect if local files are different from S3 versions - system would always upload/download without checking if files actually changed.

**Solution Implemented**: Added new `/api/s3/compare` endpoint that compares local files with S3 using:
- **File size comparison** (quick check)
- **MD5 hash comparison** (content verification using S3 ETag)

**New API Endpoint**: `POST /api/s3/compare`

**Request**:
```json
{
  "styleId": "16",
  "localImages": [
    {
      "filename": "image1.jpg",
      "localPath": "/resources/style_images/16_dynamic_simplicity/image1.jpg"
    }
  ]
}
```

**Response**:
```json
{
  "missing_in_s3": [
    {
      "filename": "new_image.jpg",
      "localPath": "/resources/...",
      "size": 123456
    }
  ],
  "missing_locally": [
    {
      "filename": "old_image.jpg",
      "s3Key": "styles/16/old_image.jpg",
      "size": 789012
    }
  ],
  "different": [
    {
      "filename": "modified.jpg",
      "localPath": "/resources/...",
      "localSize": 100000,
      "s3Size": 100000,
      "reason": "content_mismatch",
      "localMd5": "abc123...",
      "s3Etag": "def456..."
    }
  ],
  "identical": [
    {
      "filename": "unchanged.jpg",
      "size": 50000
    }
  ],
  "errors": [],
  "summary": {
    "total_local": 10,
    "total_s3": 8,
    "missing_in_s3": 3,
    "missing_locally": 1,
    "different": 2,
    "identical": 5,
    "errors": 0
  }
}
```

---

## How Change Detection Works

### Step 1: Size Comparison (Fast)
- Compares local file size with S3 file size
- If different → files are different (no need for hash check)

### Step 2: MD5 Hash Comparison (Accurate)
- Calculates MD5 hash of local file
- Compares with S3 ETag (which is the MD5 hash for simple uploads)
- If hashes match → files are identical
- If hashes differ → files have different content

### Step 3: Categorization
Files are categorized into:
- **missing_in_s3**: Local files that need to be uploaded
- **missing_locally**: S3 files that can be downloaded
- **different**: Files that exist in both but have different content
- **identical**: Files that are perfectly synced
- **errors**: Files that couldn't be compared

---

## Usage Example

### Frontend Integration

```typescript
// Compare local files with S3
const response = await fetch('/api/s3/compare', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    styleId: '16',
    localImages: [
      { filename: 'image1.jpg', localPath: '/resources/...' },
      { filename: 'image2.jpg', localPath: '/resources/...' }
    ]
  })
});

const result = await response.json();

// Show sync status
console.log(`${result.summary.identical} files in sync`);
console.log(`${result.summary.different} files need updating`);
console.log(`${result.summary.missing_in_s3} files need uploading`);

// Upload only files that are different or missing
const filesToUpload = [
  ...result.missing_in_s3,
  ...result.different
];
```

---

## Benefits

✅ **Efficient Syncing**: Only upload/download files that actually changed
✅ **Accurate Detection**: MD5 hash ensures content-level comparison
✅ **Detailed Reports**: Know exactly which files are out of sync
✅ **Error Handling**: Proper URL decoding prevents "file not found" errors
✅ **Bidirectional**: Detects both local→S3 and S3→local differences

---

## Files Modified

1. `/ui/config/routes/s3-api.ts`:
   - Fixed URL decoding in upload handler (line 140-142)
   - Added new `/api/s3/compare` endpoint (line 44-46)
   - Added `handleS3Compare()` function (line 368-533)

---

## Testing

### Test URL Decoding Fix
```bash
# Upload files with spaces in names
curl -X POST http://localhost:3000/api/s3/upload \
  -H "Content-Type: application/json" \
  -d '{
    "styleId": "16",
    "images": [{
      "filename": "A Boy and a Girl_scene_1_shot_1 (2).jpg",
      "localPath": "/resources/style_images/16_dynamic_simplicity/A%20Boy%20and%20a%20Girl_scene_1_shot_1%20(2).jpg"
    }]
  }'
```

### Test Change Detection
```bash
# Compare local files with S3
curl -X POST http://localhost:3000/api/s3/compare \
  -H "Content-Type: application/json" \
  -d '{
    "styleId": "16",
    "localImages": [{
      "filename": "image1.jpg",
      "localPath": "/resources/style_images/16_dynamic_simplicity/image1.jpg"
    }]
  }'
```

---

## Next Steps

Consider adding:
1. **Smart sync button** in UI that only uploads changed files
2. **Sync status indicators** showing which files are out of sync
3. **Automatic sync** on file changes (watch mode)
4. **Conflict resolution** for bidirectional changes
