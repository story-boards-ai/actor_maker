# Actor Training Data Management System

## Overview

The Actor Training Data Management System provides a comprehensive interface for managing training images for each actor. Unlike the style-based system which generates training images on-demand, the actor system works with pre-existing training images stored in S3 and allows bidirectional synchronization between local storage and S3.

## Key Differences from Style Training Data

| Feature | Style Training Data | Actor Training Data |
|---------|-------------------|-------------------|
| **Source** | Generated from base images using img2img | Pre-existing in S3, downloaded as needed |
| **Base Images** | Multiple base images (v2) | Single base image per actor |
| **Generation** | On-demand batch generation | Already generated, stored in S3 |
| **Workflow** | Generate → Save locally → Use | Download from S3 → Use → Upload changes |
| **Count** | Variable per style | Typically 14-20 images per actor |

## Architecture

### Data Structure

```
data/actors/{actor_name}/
├── base_image/
│   └── {actor_name}_base.png          # Single base image for the actor
├── training_data/
│   ├── request.json                    # Original training generation request
│   ├── response.json                   # S3 URLs and metadata
│   ├── {actor_name}_0.png             # Training image 0 (if synced locally)
│   ├── {actor_name}_1.png             # Training image 1 (if synced locally)
│   └── ...                             # Additional training images
└── poster_frame/
    └── {actor_name}_poster_urls.json  # Poster frame URLs
```

### S3 Storage Structure

**Bucket:** `story-boards-assets`

**Training Data Path:**
```
system_actors/training_data/{actor_name}/{actor_name}_{index}.png
```

**Example:**
```
system_actors/training_data/0002_european_35_female/0002_european_35_female_0.png
system_actors/training_data/0002_european_35_female/0002_european_35_female_1.png
...
system_actors/training_data/0002_european_35_female/0002_european_35_female_19.png
```

## Components

### 1. ActorTrainingDataManager Component

**Location:** `ui/src/components/ActorTrainingDataManager/`

**Features:**
- View base image and actor metadata
- Display all training images (S3 and local)
- Sync from S3 (download images)
- Sync to S3 (upload images)
- Generate new training images (placeholder)
- Visual indicators for local vs S3-only images

**UI Elements:**
- **Header:** Actor name, statistics, action buttons
- **Base Image Section:** Shows the single base image with actor info
- **Training Images Grid:** Displays all training images with badges
  - 💾 Local: Image exists locally
  - ☁️ S3 Only: Image only in S3, not downloaded yet

### 2. API Endpoints

**Location:** `ui/config/routes/actors-api.ts`

#### GET `/api/actors/:actorId/training-data`
Returns training data information for an actor.

**Response:**
```json
{
  "actor_id": 2,
  "actor_name": "0002_european_35_female",
  "s3_urls": [
    "https://story-boards-assets.s3.us-west-1.amazonaws.com/system_actors/training_data/0002_european_35_female/0002_european_35_female_0.png",
    ...
  ],
  "local_images": ["0002_european_35_female_0.png", ...],
  "base_image_path": "/data/actors/0002_european_35_female/base_image/0002_european_35_female_base.png",
  "synced": false
}
```

#### POST `/api/actors/:actorId/training-data/sync-from-s3`
Downloads training images from S3 to local storage.

**Request:**
```json
{
  "actor_name": "0002_european_35_female",
  "s3_urls": ["url1", "url2", ...]
}
```

**Response:**
```json
{
  "downloaded": 20,
  "failed": 0,
  "total": 20,
  "errors": []
}
```

#### POST `/api/actors/:actorId/training-data/sync-to-s3`
Uploads local training images to S3.

**Request:**
```json
{
  "actor_name": "0002_european_35_female"
}
```

**Response:**
```json
{
  "uploaded": 20,
  "failed": 0,
  "total": 20,
  "s3_urls": ["url1", "url2", ...],
  "errors": []
}
```

#### POST `/api/actors/:actorId/training-data/generate`
Generates new training images from base image (not yet implemented).

### 3. Python Scripts

**Location:** `scripts/`

#### `sync_actor_training_from_s3.py`
Downloads training images from S3 to local storage.

**Usage:**
```bash
python3 scripts/sync_actor_training_from_s3.py <actor_name> '<s3_urls_json>'
```

**Features:**
- Parses S3 URLs to extract bucket and key
- Downloads images using boto3
- Skips already downloaded images
- Creates local directory structure
- Returns JSON with download statistics

#### `sync_actor_training_to_s3.py`
Uploads local training images to S3.

**Usage:**
```bash
python3 scripts/sync_actor_training_to_s3.py <actor_name>
```

**Features:**
- Finds all local training images
- Uploads to S3 with proper naming
- Skips already uploaded images
- Updates response.json with new S3 URLs
- Returns JSON with upload statistics

#### `generate_actor_training_images.py`
Placeholder for future training image generation.

**Status:** Not yet implemented

## User Workflows

### Workflow 1: View Training Data

1. **Open Actor Library** (Actors Maker tab)
2. **Click "📸 Training Data"** on any actor card
3. **View Training Images:**
   - Base image shown at top
   - Training images displayed in grid
   - Badges indicate local vs S3-only status

### Workflow 2: Download Training Images from S3

1. **Open Training Data Manager** for an actor
2. **Click "⬇️ Sync from S3"** button
3. **Wait for Download:**
   - Progress bar shows download status
   - Images are saved to local storage
   - Grid updates to show local images

**Use Case:** Download training images to use locally for training or analysis

### Workflow 3: Upload Training Images to S3

1. **Generate or modify training images locally**
2. **Open Training Data Manager**
3. **Click "⬆️ Sync to S3"** button
4. **Wait for Upload:**
   - Progress bar shows upload status
   - Images uploaded to S3
   - response.json updated with new URLs

**Use Case:** Backup local training images to S3 or share with team

### Workflow 4: Generate New Training Images

1. **Open Training Data Manager**
2. **Click "✨ Generate Images"** button
3. **System generates variations** from base image

**Status:** Not yet implemented - currently returns error message

## Integration Points

### Actor Type Extension

**Location:** `ui/src/types.ts`

Added `training_data` field to Actor interface:

```typescript
export interface Actor {
  // ... existing fields ...
  training_data?: {
    s3_urls: string[];
    local_path: string;
    base_image_path: string;
    count: number;
    synced: boolean;
  };
}
```

### ActorCard Integration

**Location:** `ui/src/components/ActorCard.tsx`

Added "📸 Training Data" button that opens the training manager in a new tab.

### App.tsx Integration

**Location:** `ui/src/App.tsx`

- Added `ActorTrainingTab` interface
- Added `handleOpenActorTraining` handler
- Added dynamic tab for actor training manager
- Integrated with existing tab system

## Technical Details

### S3 URL Parsing

The system handles both S3 URL formats:
- Standard: `https://bucket.s3.region.amazonaws.com/path/file.png`
- Accelerated: `https://bucket.s3-accelerate.amazonaws.com/path/file.png`

### File Naming Convention

**Base Image:**
- Format: `{actor_name}_base.png`
- Example: `0002_european_35_female_base.png`

**Training Images:**
- Format: `{actor_name}_{index}.png`
- Example: `0002_european_35_female_0.png`
- Index: 0-19 (typically 20 images)

### Local vs S3 Status

The system tracks which images exist locally vs only in S3:

- **Local Images:** Listed in `local_images` array
- **S3 URLs:** Listed in `s3_urls` array from response.json
- **Synced:** Boolean indicating if all S3 images are downloaded

### Progress Tracking

Both sync operations provide real-time progress:
- Progress bar shows current/total
- Status messages display in UI
- Errors logged to console and returned in response

## Environment Requirements

### AWS Credentials

Required environment variables:
```bash
AWS_ACCESS_KEY=your_access_key
AWS_ACCESS_SECRET=your_secret_key
AWS_REGION=us-west-1
```

### Python Dependencies

```bash
boto3>=1.26.0
```

Install with:
```bash
pip install boto3
```

## Error Handling

### Common Errors

**"Actor not found"**
- Actor ID doesn't exist in actorsData.json
- Check actor ID is correct

**"Training data directory not found"**
- Actor doesn't have training_data folder
- Run sync-from-s3 to create and populate

**"AWS credentials not configured"**
- Set AWS_ACCESS_KEY and AWS_ACCESS_SECRET
- Check .env file in project root

**"Failed to download from S3"**
- Check AWS credentials
- Verify S3 URLs are correct
- Check network connectivity

**"Failed to upload to S3"**
- Check AWS credentials
- Verify write permissions to bucket
- Check local images exist

### Recovery

**Partial Download Failure:**
- Script skips already downloaded images
- Re-run sync-from-s3 to retry failed images
- Check errors array in response

**Partial Upload Failure:**
- Script skips already uploaded images
- Re-run sync-to-s3 to retry failed images
- Check errors array in response

## Performance Considerations

### Download Performance

- **Concurrent Downloads:** Currently sequential (one at a time)
- **Typical Time:** ~2-3 seconds per image
- **Total Time:** ~40-60 seconds for 20 images
- **Network:** Depends on connection speed

### Upload Performance

- **Concurrent Uploads:** Currently sequential
- **Typical Time:** ~3-5 seconds per image
- **Total Time:** ~60-100 seconds for 20 images
- **Network:** Depends on connection speed

### Storage

- **Per Actor:** ~20 images × ~2MB = ~40MB
- **287 Actors:** ~11.5GB total if all synced
- **Recommendation:** Sync only needed actors

## Future Enhancements

### Planned Features

1. **Training Image Generation**
   - Implement img2img workflow for actors
   - Generate variations from base image
   - Apply different poses, expressions, lighting

2. **Parallel Downloads/Uploads**
   - Process multiple images concurrently
   - Reduce total sync time
   - Add concurrency configuration

3. **Selective Sync**
   - Choose specific images to download
   - Range selection (e.g., images 0-9)
   - Smart sync based on usage

4. **Image Preview**
   - Full-size image viewer
   - Compare base vs training images
   - Side-by-side comparison mode

5. **Batch Operations**
   - Sync multiple actors at once
   - Bulk download/upload
   - Progress tracking per actor

6. **Cache Management**
   - Clear local cache
   - Selective deletion
   - Storage usage monitoring

## Best Practices

### When to Sync from S3

- **First time using an actor:** Download all training images
- **After S3 updates:** Re-sync to get latest versions
- **Disk space available:** Only if you have sufficient storage

### When to Sync to S3

- **After generating new images:** Backup to S3
- **After modifying images:** Update S3 versions
- **Before sharing:** Ensure team has access

### Storage Management

- **Sync selectively:** Only download actors you're actively using
- **Clean up periodically:** Delete unused local images
- **Monitor disk space:** Check available storage before syncing

### Workflow Tips

1. **Start with sync-from-s3** to get existing training data
2. **Work locally** for faster access
3. **Sync-to-s3** when done to backup changes
4. **Use local images** for training to avoid S3 costs

## Troubleshooting

### Images not appearing in UI

1. Check browser console for errors
2. Verify images downloaded to correct path
3. Refresh the training data manager
4. Check file permissions

### Sync stuck or slow

1. Check network connectivity
2. Verify AWS credentials are valid
3. Check S3 bucket permissions
4. Monitor Python script output

### Missing base image

1. Check `base_image` directory exists
2. Verify filename matches pattern
3. Download from S3 if needed
4. Check actor data migration

## Conclusion

The Actor Training Data Management System provides a complete solution for managing pre-existing training images stored in S3. It enables easy synchronization between local storage and S3, with a clean UI for viewing and managing training data per actor.

Key benefits:
- ✅ View all training images per actor
- ✅ Bidirectional S3 sync
- ✅ Track local vs S3 status
- ✅ Progress tracking and error handling
- ✅ Integration with existing actor library
- ✅ Scalable to 287+ actors

Happy training! 🎭
