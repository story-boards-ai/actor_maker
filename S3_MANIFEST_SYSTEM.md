# S3 Manifest System

## Overview

Automatic tracking system for S3 training data uploads. Each style gets its own JSON manifest file that records all uploaded files with complete metadata.

---

## 📁 File Structure

### Manifest Location
```
/data/s3_manifests/
├── README.md
├── style_1_s3_manifest.json
├── style_16_s3_manifest.json
├── style_100_s3_manifest.json
└── ...
```

### Manifest Format
```json
{
  "style_id": "16",
  "style_title": "Dynamic Simplicity",
  "s3_bucket": "storyboard-user-files",
  "s3_prefix": "styles/16/",
  "created_at": "2025-10-11T10:00:00.000Z",
  "last_synced": "2025-10-11T11:00:00.000Z",
  "total_files": 25,
  "total_size_bytes": 12345678,
  "files": [
    {
      "filename": "image_001.jpg",
      "s3_key": "styles/16/image_001.jpg",
      "s3_url": "https://storyboard-user-files.s3.us-west-1.amazonaws.com/styles/16/image_001.jpg",
      "size_bytes": 123456,
      "md5_hash": "abc123def456789...",
      "uploaded_at": "2025-10-11T10:30:00.000Z",
      "last_modified": "2025-10-11T10:30:00.000Z",
      "local_path": "/resources/style_images/16_dynamic_simplicity/image_001.jpg"
    }
  ]
}
```

---

## 🔄 Automatic Updates

### When Manifests Are Updated

**1. During Sync to S3:**
- After successful upload of files
- Records each uploaded file with metadata
- Updates `last_synced` timestamp
- Recalculates `total_files` and `total_size_bytes`

**2. File Metadata Captured:**
- ✅ Filename
- ✅ S3 key (full path in bucket)
- ✅ S3 URL (direct access URL)
- ✅ File size in bytes
- ✅ MD5 hash (for integrity verification)
- ✅ Upload timestamp
- ✅ Local file path (for reference)

**3. Manifest Maintenance:**
- Existing file entries are replaced on re-upload
- Files are sorted alphabetically by filename
- Totals are automatically recalculated

---

## 🎯 Use Cases

### 1. **Training Data Audit**
Know exactly what training data is in S3 for each style:
```bash
# View manifest
GET /api/s3/manifest?styleId=16
```

### 2. **Sync Verification**
Verify local files match S3 versions:
- Compare local MD5 hash with manifest MD5
- Check file sizes match
- Verify timestamps

### 3. **Backup & Recovery**
Restore training data from S3:
- Manifest lists all files and their S3 locations
- Download specific files or entire style dataset
- Verify integrity after download using MD5 hashes

### 4. **Storage Management**
Track storage usage per style:
- `total_size_bytes` shows storage used
- `total_files` shows number of training images
- Identify styles with large datasets

### 5. **Debugging**
Troubleshoot sync issues:
- Check when files were last uploaded
- Verify S3 URLs are correct
- Compare local paths with S3 keys

---

## 🔧 API Endpoints

### Get Manifest
```http
GET /api/s3/manifest?styleId=16
```

**Response (200 OK):**
```json
{
  "style_id": "16",
  "style_title": "Dynamic Simplicity",
  "s3_bucket": "storyboard-user-files",
  "s3_prefix": "styles/16/",
  "created_at": "2025-10-11T10:00:00.000Z",
  "last_synced": "2025-10-11T11:00:00.000Z",
  "total_files": 25,
  "total_size_bytes": 12345678,
  "files": [...]
}
```

**Response (404 Not Found):**
```json
{
  "error": "Manifest not found",
  "message": "No S3 uploads have been made for this style yet"
}
```

---

## 💡 Implementation Details

### Upload Process with Manifest Update

**Step 1: Upload Files**
```python
# In Python script
for img in images:
    # Upload to S3
    result = client.upload_image(file_data, bucket, s3_key, extension=ext)
    
    # Record upload details
    uploaded_files.append({
        'filename': img['filename'],
        's3_key': s3_key,
        's3_url': f"https://{bucket}.s3.{region}.amazonaws.com/{s3_key}",
        'size_bytes': file_size,
        'md5_hash': md5_hash,
        'uploaded_at': datetime.utcnow().isoformat() + 'Z',
        'local_path': img['localPath']
    })
```

**Step 2: Update Manifest**
```typescript
// In Node.js handler
if (parsedResult.uploaded > 0 && parsedResult.uploaded_files) {
  await updateS3Manifest(projectRoot, styleId, parsedResult.uploaded_files)
}
```

**Step 3: Manifest Update Logic**
```typescript
async function updateS3Manifest(projectRoot, styleId, uploadedFiles) {
  // Load or create manifest
  let manifest = loadOrCreateManifest(styleId)
  
  // Update file entries (replace if exists)
  for (const file of uploadedFiles) {
    manifest.files = manifest.files.filter(f => f.filename !== file.filename)
    manifest.files.push(file)
  }
  
  // Update metadata
  manifest.last_synced = new Date().toISOString()
  manifest.total_files = manifest.files.length
  manifest.total_size_bytes = sum(manifest.files.map(f => f.size_bytes))
  
  // Save
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
}
```

---

## 📊 Manifest Statistics

### Per-Style Information
- **Total Files**: Number of training images in S3
- **Total Size**: Combined size of all files
- **Last Synced**: When files were last uploaded
- **Created At**: When first upload occurred

### Per-File Information
- **Filename**: Original filename
- **S3 Key**: Full path in S3 bucket
- **S3 URL**: Direct access URL
- **Size**: File size in bytes
- **MD5 Hash**: Content hash for verification
- **Uploaded At**: Upload timestamp
- **Local Path**: Original local file path

---

## 🔍 Example Manifest

```json
{
  "style_id": "100",
  "style_title": "Dark Narrative",
  "s3_bucket": "storyboard-user-files",
  "s3_prefix": "styles/100/",
  "created_at": "2025-10-10T15:00:00.000Z",
  "last_synced": "2025-10-11T11:00:00.000Z",
  "total_files": 3,
  "total_size_bytes": 456789,
  "files": [
    {
      "filename": "training_001.jpg",
      "s3_key": "styles/100/training_001.jpg",
      "s3_url": "https://storyboard-user-files.s3.us-west-1.amazonaws.com/styles/100/training_001.jpg",
      "size_bytes": 152263,
      "md5_hash": "a1b2c3d4e5f6...",
      "uploaded_at": "2025-10-11T10:30:00.000Z",
      "last_modified": "2025-10-11T10:30:00.000Z",
      "local_path": "/resources/style_images/100_dark_narrative/training_001.jpg"
    },
    {
      "filename": "training_002.jpg",
      "s3_key": "styles/100/training_002.jpg",
      "s3_url": "https://storyboard-user-files.s3.us-west-1.amazonaws.com/styles/100/training_002.jpg",
      "size_bytes": 152263,
      "md5_hash": "f6e5d4c3b2a1...",
      "uploaded_at": "2025-10-11T10:30:05.000Z",
      "last_modified": "2025-10-11T10:30:05.000Z",
      "local_path": "/resources/style_images/100_dark_narrative/training_002.jpg"
    },
    {
      "filename": "training_003.jpg",
      "s3_key": "styles/100/training_003.jpg",
      "s3_url": "https://storyboard-user-files.s3.us-west-1.amazonaws.com/styles/100/training_003.jpg",
      "size_bytes": 152263,
      "md5_hash": "123456789abc...",
      "uploaded_at": "2025-10-11T10:30:10.000Z",
      "last_modified": "2025-10-11T10:30:10.000Z",
      "local_path": "/resources/style_images/100_dark_narrative/training_003.jpg"
    }
  ]
}
```

---

## ✅ Benefits

### 1. **Complete Traceability**
- Know exactly what's in S3 for each style
- Track when files were uploaded
- Maintain audit trail

### 2. **Offline Access**
- Query manifest without S3 API calls
- Faster lookups
- Reduced API costs

### 3. **Integrity Verification**
- MD5 hashes for content verification
- File size validation
- Detect corruption or tampering

### 4. **Disaster Recovery**
- Complete inventory of S3 files
- Direct URLs for restoration
- Local path mapping for organization

### 5. **Storage Analytics**
- Track storage usage per style
- Identify large datasets
- Plan storage optimization

---

## 🔄 Workflow Integration

### Sync to S3 Flow
```
1. User clicks "Sync to S3"
2. System compares local files with S3
3. Uploads new/changed files
4. Python script returns upload details
5. Node.js updates manifest automatically
6. Manifest saved to disk
7. User sees success toast
```

### Manifest Query Flow
```
1. User/system requests manifest
2. GET /api/s3/manifest?styleId=16
3. System reads JSON file from disk
4. Returns manifest data
5. No S3 API calls needed
```

---

## 📁 Files Modified

- `/ui/config/routes/s3-api.ts`:
  - Enhanced upload handler to capture file metadata
  - Added `updateS3Manifest()` function
  - Added `handleGetManifest()` endpoint
  - Automatic manifest updates after uploads

- `/data/s3_manifests/`:
  - New directory for manifest files
  - One JSON file per style
  - README with format documentation

---

## 🎯 Future Enhancements

Potential additions:
- Manifest versioning (track changes over time)
- Deletion tracking (record removed files)
- Download history (track when files were downloaded)
- Sync conflict resolution (handle concurrent uploads)
- Manifest validation (verify S3 matches manifest)
- Batch operations (update multiple styles at once)

---

## ✨ Result

Every S3 upload is now automatically tracked with complete metadata in per-style manifest files. This provides full traceability, enables offline queries, supports disaster recovery, and maintains a complete audit trail of all training data uploads.
