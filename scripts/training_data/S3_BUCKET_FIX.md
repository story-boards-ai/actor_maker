# ✅ S3 Bucket Configuration Fixed

## 🐛 Problem Identified

The balancer was uploading images to the **wrong S3 bucket and path**:

### **Original Training Data:**
- Bucket: `story-boards-assets`
- Path: `system_actors/training_data/{actor_id}/`
- URL Format: `https://story-boards-assets.s3.us-west-1.amazonaws.com/system_actors/training_data/0001_european_20_female/0001_european_20_female_16.jpg`

### **Balancer (Before Fix):**
- Bucket: `storyboard-user-files` ❌
- Path: `system/actors/{actor_id}/training_data/` ❌
- URL Format: `https://storyboard-user-files.s3.us-west-1.amazonaws.com/system/actors/0001_european_20_female/training_data/0001_european_20_female_30.jpg` ❌

This caused the UI to show:
- ❌ Broken images (wrong bucket)
- ❌ "Only exists in S3" (wrong URL)
- ❌ "Only exists locally" (S3 URL mismatch)

## ✅ Solution Applied

Updated `training_data_balancer.py` to use the correct S3 configuration:

```python
# Upload to S3 (use story-boards-assets bucket to match existing training data)
s3_url = upload_image_to_s3(
    image_base64=image_base64,
    user_id="system_actors",           # ✓ Correct path prefix
    folder=f"training_data/{actor_id}", # ✓ Correct folder structure
    filename=filename,
    bucket="story-boards-assets"        # ✓ Correct bucket
)
```

### **Balancer (After Fix):**
- Bucket: `story-boards-assets` ✅
- Path: `system_actors/training_data/{actor_id}/` ✅
- URL Format: `https://story-boards-assets.s3.us-west-1.amazonaws.com/system_actors/training_data/0001_european_20_female/0001_european_20_female_30.jpg` ✅

## 🔧 Additional Fix

Also added the missing `upload_image_to_s3()` function to `src/utils/s3.py`:

```python
def upload_image_to_s3(
    image_base64: str,
    user_id: str,
    folder: str,
    filename: str,
    bucket: Optional[str] = None
) -> str:
    """Upload a base64-encoded image to S3."""
    # Decode base64 to bytes
    image_bytes = base64.b64decode(image_base64)
    
    # Use default bucket if not specified
    if bucket is None:
        bucket = S3Config.AWS_USER_FILES_BUCKET
    
    # Construct S3 key
    key = f"{user_id}/{folder}/{filename}"
    
    # Upload to S3
    client = S3Client()
    result = client.upload_file(
        file_data=image_bytes,
        bucket=bucket,
        key=key,
        content_type="image/jpeg"
    )
    
    # Return full S3 URL
    s3_url = result.get("url")
    if not s3_url:
        s3_url = f"https://{bucket}.s3.{S3Config.AWS_REGION}.amazonaws.com/{key}"
    
    return s3_url
```

## ✅ Verification

Re-ran the balancer on actor 0001:

```bash
source activate.sh
python scripts/training_data/evaluate_and_balance.py --actor-id 0001_european_20_female --execute
```

### **Results:**
- ✅ Generated 7 new images (30-36)
- ✅ Uploaded to correct bucket: `story-boards-assets`
- ✅ Correct path: `system_actors/training_data/0001_european_20_female/`
- ✅ Saved local copies
- ✅ Updated manifest
- ✅ Total images: 17

### **Sample S3 URL:**
```
https://story-boards-assets.s3.us-west-1.amazonaws.com/system_actors/training_data/0001_european_20_female/0001_european_20_female_30.jpg
```

## 📊 Final Status

The UI should now show all images correctly:
- ✅ All images synced (S3 + local)
- ✅ No broken images
- ✅ Consistent bucket and path structure
- ✅ Ready for training

## 🎯 Files Modified

1. **`scripts/training_data/training_data_balancer.py`**
   - Fixed S3 upload to use correct bucket and path

2. **`src/utils/s3.py`**
   - Added missing `upload_image_to_s3()` function

3. **`data/actors/0001_european_20_female/training_data/manifest.json`**
   - Cleaned up bad generation
   - Re-generated with correct S3 URLs
