# AWS S3 Implementation

Complete implementation of AWS S3 functionality for the actor_maker project, matching the backend patterns.

## Overview

The S3 utilities provide comprehensive file storage capabilities including:
- Upload/download files to/from AWS S3
- Image processing and conversion
- Training data management with proper naming conventions
- Base64 encoding/decoding
- File deletion and URL parsing

## Modules

### 1. `src/utils/s3.py` - Core S3 Client

**Main Class**: `S3Client`

Provides low-level S3 operations using boto3.

#### Key Features
- Upload files with custom content types
- Download files as bytes or base64
- Delete files by key or URL
- List files with prefix filtering
- Check file existence
- Automatic URL parsing

#### Usage Example
```python
from src.utils import S3Client

client = S3Client()

# Upload a file
result = client.upload_file(
    file_data=image_bytes,
    bucket="my-bucket",
    key="path/to/file.jpg",
    content_type="image/jpeg"
)

# Download a file
data = client.download_file("my-bucket", "path/to/file.jpg")

# Download as base64
base64_str = client.download_file_to_base64("my-bucket", "path/to/file.jpg")

# Delete by URL
client.delete_file_by_url("https://my-bucket.s3.us-west-1.amazonaws.com/path/to/file.jpg")
```

#### Convenience Functions
```python
from src.utils import (
    upload_to_s3,
    download_from_s3,
    download_s3_to_base64,
    delete_from_s3,
    delete_s3_url,
)

# Simple upload
result = upload_to_s3(file_data, bucket, key, content_type)

# Simple download
data = download_from_s3(bucket, key)
```

### 2. `src/utils/training_s3.py` - Training Data Management

**Main Class**: `TrainingS3Uploader`

Specialized utilities for uploading training data with proper naming conventions.

#### Key Features
- Automatic filename sanitization
- Timestamped file naming
- Sequential index management
- Support for both styles and actors
- Batch upload with collision prevention

#### Naming Conventions

**Training Data Files**:
```
{type}_{id}_td_{timestamp}_{index}.{ext}

Examples:
- style_abc12345_td_1704397200_01.jpg
- actor_def67890_td_1704397201_02.png
```

**Source Images**:
```
{type}_{id}_source_{timestamp}.{ext}

Examples:
- style_abc12345_source_1704397200.jpg
- actor_def67890_source_1704397201.png
```

#### S3 Key Structure
```
{user_id}/custom_{type}/{subfolder}/{item_id}/{filename}

Examples:
- user123/custom_style/training_data/style-456/style_456abc_td_1704397200_01.jpg
- user123/custom_actor/source_image/actor-789/actor_789def_source_1704397200.jpg
```

#### Usage Example
```python
from src.utils import (
    upload_style_training_images,
    upload_actor_training_images,
    TrainingS3Uploader,
)

# Upload multiple style training images
urls = upload_style_training_images(
    user_id="user123",
    style_id="style-456",
    images=[
        (image_bytes_1, "image1.jpg"),
        (image_bytes_2, "image2.png"),
        image_bytes_3,  # Will use default filename
    ]
)
# Returns: ["https://...", "https://...", "https://..."]

# Upload actor training images
urls = upload_actor_training_images(
    user_id="user123",
    actor_id="actor-789",
    images=training_images
)

# Use the uploader directly for more control
uploader = TrainingS3Uploader()
url = uploader.upload_source_image(
    user_id="user123",
    item_id="style-456",
    image_data=source_image_bytes,
    original_filename="source.jpg",
    item_type="style"
)
```

### 3. `src/utils/image_processing.py` - Image Utilities

Comprehensive image processing utilities using Pillow.

#### Key Features
- Format conversion (JPEG, PNG, WEBP)
- Resizing with aspect ratio preservation
- Thumbnail generation
- Base64 encoding/decoding
- Image validation
- Information extraction

#### Usage Examples

**Format Conversion**:
```python
from src.utils import convert_image_format, resize_image

# Convert to JPEG
jpeg_bytes = convert_image_format(png_bytes, format='JPEG', quality=95)

# Resize image
resized = resize_image(image_bytes, width=800, height=600)
```

**Base64 Operations**:
```python
from src.utils import image_to_base64, base64_to_image

# Convert to base64
base64_str = image_to_base64(image_bytes)

# Convert from base64
img = base64_to_image(base64_str)
```

**Thumbnails**:
```python
from src.utils import create_thumbnail

thumbnail = create_thumbnail(image_bytes, size=(256, 256))
```

**Image Information**:
```python
from src.utils import get_image_info, validate_image

# Get detailed info
info = get_image_info(image_bytes)
# Returns: {width, height, format, mode, size_bytes, size_kb, size_mb}

# Validate image
is_valid = validate_image(image_bytes)
```

## Configuration

### Environment Variables

Required variables in `.env`:

```bash
# AWS S3 credentials (REQUIRED)
AWS_ACCESS_KEY=your_aws_access_key
AWS_ACCESS_SECRET=your_aws_secret_key
AWS_REGION=us-west-1

# S3 bucket names (OPTIONAL - have defaults)
AWS_USER_FILES_BUCKET=storyboard-user-files
AWS_USER_IMAGES_BUCKET=your_images_bucket
AWS_OUTFIT_BUCKET=your_outfit_bucket
```

### S3Config Class

Access configuration programmatically:

```python
from src.utils.s3 import S3Config

# Access config values
bucket = S3Config.AWS_USER_FILES_BUCKET
region = S3Config.AWS_REGION

# Validate configuration
S3Config.validate()  # Raises ValueError if credentials missing
```

## Integration with Backend

This implementation matches the backend TypeScript patterns:

### Backend → Python Mapping

| Backend File | Python File | Purpose |
|-------------|-------------|---------|
| `shared/s3.service.ts` | `utils/s3.py` | Core S3 operations |
| `custom-actors/utils/s3-upload.util.ts` | `utils/training_s3.py` | Training uploads |
| `images/utils/aws.ts` | `utils/s3.py` | Image S3 operations |
| N/A | `utils/image_processing.py` | Image utilities |

### Feature Parity

✅ **Implemented**:
- Upload files to S3 with content type
- Download files from S3
- Delete files by key or URL
- Base64 encoding/decoding
- Training data uploads with naming conventions
- Image format conversion
- Image resizing and thumbnails

📋 **Additional Features** (beyond backend):
- Image validation
- Thumbnail generation
- Comprehensive image info extraction
- Multiple format support (JPEG, PNG, WEBP)
- Aspect ratio preservation

## Examples

Complete examples available in `examples/s3_usage.py`:

1. **Basic S3 Operations** - Upload, download, delete
2. **Image Upload** - Upload images with proper content types
3. **Download to Base64** - Get files as base64 strings
4. **Training Data Upload** - Batch upload training images
5. **Image Processing** - Resize, convert, create thumbnails
6. **S3Client Features** - List files, check existence
7. **Error Handling** - Proper exception handling

Run examples:
```bash
cd examples
python s3_usage.py
```

## Testing

Unit tests available in `tests/unit/`:

- `test_s3.py` - S3Client tests with mocked boto3
- `test_image_processing.py` - Image processing tests

Run tests:
```bash
python -m pytest tests/unit/test_s3.py -v
python -m pytest tests/unit/test_image_processing.py -v
```

## Dependencies

Added to `requirements.txt`:
```
boto3>=1.28.0    # AWS S3 client
Pillow>=10.0.0   # Image processing
```

Install:
```bash
pip install -r requirements.txt
```

## Error Handling

All S3 operations include proper error handling:

```python
from src.utils import S3Client
from botocore.exceptions import ClientError

try:
    client = S3Client()
    data = client.download_file("bucket", "key")
except ClientError as e:
    error_code = e.response['Error']['Code']
    if error_code == '404':
        print("File not found")
    elif error_code == '403':
        print("Access denied")
    else:
        print(f"S3 error: {error_code}")
except ValueError as e:
    print(f"Configuration error: {e}")
```

## Best Practices

### 1. Use Convenience Functions for Simple Operations

```python
# Good - simple and clear
from src.utils import upload_to_s3, download_from_s3

upload_to_s3(data, bucket, key, content_type)
data = download_from_s3(bucket, key)
```

### 2. Use Classes for Complex Operations

```python
# Good - for multiple operations with same credentials
from src.utils import S3Client

client = S3Client()
client.upload_file(data1, bucket, key1, content_type)
client.upload_file(data2, bucket, key2, content_type)
client.list_files(bucket, prefix="uploads/")
```

### 3. Use Training Uploader for Training Data

```python
# Good - proper naming and organization
from src.utils import upload_style_training_images

urls = upload_style_training_images(user_id, style_id, images)
```

### 4. Always Set Proper Content Types

```python
# Good - correct content type
client.upload_image(image_bytes, bucket, key, extension="jpg")

# Bad - generic content type
client.upload_file(image_bytes, bucket, key, content_type="application/octet-stream")
```

### 5. Handle Errors Appropriately

```python
# Good - specific error handling
try:
    data = download_from_s3(bucket, key)
except ClientError as e:
    if e.response['Error']['Code'] == '404':
        # Handle missing file
        use_default_data()
    else:
        # Handle other errors
        raise
```

## Common Use Cases

### Upload Training Images

```python
from src.utils import upload_style_training_images

# Prepare images (as bytes or tuples)
images = [
    (image1_bytes, "image1.jpg"),
    (image2_bytes, "image2.png"),
    image3_bytes,  # Will use default name
]

# Upload
urls = upload_style_training_images(
    user_id="user_123",
    style_id="style_456",
    images=images
)

print(f"Uploaded {len(urls)} images")
# Use urls in training request
```

### Download and Process Image

```python
from src.utils import download_from_s3, resize_image, image_to_base64

# Download
image_bytes = download_from_s3("my-bucket", "path/to/image.jpg")

# Resize
resized = resize_image(image_bytes, max_size=512)

# Convert to base64 for API
base64_str = image_to_base64(resized)
```

### Create Thumbnails for UI

```python
from src.utils import download_from_s3, create_thumbnail, upload_to_s3

# Download original
original = download_from_s3("bucket", "images/large.jpg")

# Create thumbnail
thumbnail = create_thumbnail(original, size=(256, 256))

# Upload thumbnail
upload_to_s3(
    thumbnail,
    "bucket",
    "thumbnails/large_thumb.jpg",
    content_type="image/jpeg"
)
```

## Troubleshooting

### Issue: "AWS credentials not found"
**Solution**: Set `AWS_ACCESS_KEY` and `AWS_ACCESS_SECRET` in `.env`

### Issue: "No module named 'boto3'"
**Solution**: Run `pip install boto3`

### Issue: "AccessDenied error"
**Solution**: Check IAM permissions for S3 bucket access

### Issue: "Image format not supported"
**Solution**: Ensure Pillow is installed: `pip install Pillow`

### Issue: "URL parsing failed"
**Solution**: Ensure S3 URL is in correct format:
```
https://bucket-name.s3.region.amazonaws.com/path/to/file.ext
```

## Future Enhancements

Potential additions for future development:

- [ ] Multipart upload for large files
- [ ] Presigned URL generation
- [ ] S3 bucket versioning support
- [ ] CloudFront CDN integration
- [ ] Automatic image optimization
- [ ] Batch operations with progress tracking
- [ ] S3 event notifications
- [ ] Encryption at rest configuration

## Summary

The S3 implementation provides:
- ✅ Complete parity with backend functionality
- ✅ Additional image processing capabilities
- ✅ Clean, Pythonic API
- ✅ Comprehensive error handling
- ✅ Full test coverage
- ✅ Detailed documentation and examples

All utilities are production-ready and follow the same patterns as the backend implementation.
