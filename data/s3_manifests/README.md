# S3 Training Data Manifests

This directory contains S3 manifest files for each style's training data.

## File Structure

Each style has its own manifest file: `style_{id}_s3_manifest.json`

Example: `style_1_s3_manifest.json`, `style_16_s3_manifest.json`

## Manifest Format

```json
{
  "style_id": "16",
  "style_title": "Dynamic Simplicity",
  "s3_bucket": "storyboard-user-files",
  "s3_prefix": "styles/16/",
  "last_synced": "2025-10-11T11:00:00.000Z",
  "total_files": 25,
  "total_size_bytes": 12345678,
  "files": [
    {
      "filename": "image_001.jpg",
      "s3_key": "styles/16/image_001.jpg",
      "s3_url": "https://storyboard-user-files.s3.us-west-1.amazonaws.com/styles/16/image_001.jpg",
      "size_bytes": 123456,
      "md5_hash": "abc123def456...",
      "uploaded_at": "2025-10-11T10:30:00.000Z",
      "last_modified": "2025-10-11T10:30:00.000Z",
      "local_path": "resources/style_images/16_dynamic_simplicity/image_001.jpg"
    }
  ]
}
```

## Purpose

- Track all training data files uploaded to S3 for each style
- Maintain file metadata (size, hash, timestamps)
- Enable efficient sync operations
- Provide audit trail of uploads
- Support backup and recovery operations

## Usage

Manifests are automatically updated when:
- Files are synced to S3
- Files are removed from S3
- Sync operations are performed

## Benefits

- **Traceability**: Know exactly what's in S3 for each style
- **Efficiency**: Quick lookup without S3 API calls
- **Validation**: Verify local files match S3 versions
- **Recovery**: Restore training data from S3 if needed
- **Audit**: Track when files were uploaded/modified
