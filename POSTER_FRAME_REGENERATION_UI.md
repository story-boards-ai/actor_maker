# Poster Frame Regeneration - UI Integration

## Overview

Added poster frame regeneration functionality to the Actor Library UI with a small icon button on each actor card. When clicked, it regenerates the poster frame using the actor's trained LoRA model, converts to multiple WebP sizes, uploads to S3, and updates the frontend.

## Implementation Summary

### Backend API Endpoint

**Route**: `POST /api/actors/:actorId/regenerate-poster-frame`

**Location**: `/ui/config/routes/actors-api.ts`

**Handler**: `handleRegeneratePosterFrame()`

**Request Body**:
```json
{
  "actor_name": "0001_european_20_female",
  "lora_model_url": "s3://bucket/models/0001_european_20_female.safetensors",
  "actor_description": "a young European woman with long brown hair"
}
```

**Response**:
```json
{
  "success": true,
  "actor_id": "1",
  "actor_name": "0001_european_20_female",
  "poster_frames": {
    "accelerated": {
      "webp_sm": "https://bucket.s3-accelerate.amazonaws.com/actors/.../poster_sm.webp",
      "webp_md": "https://bucket.s3-accelerate.amazonaws.com/actors/.../poster_md.webp",
      "webp_lg": "https://bucket.s3-accelerate.amazonaws.com/actors/.../poster_lg.webp"
    },
    "standard": {
      "webp_sm": "https://bucket.s3.region.amazonaws.com/actors/.../poster_sm.webp",
      "webp_md": "https://bucket.s3.region.amazonaws.com/actors/.../poster_md.webp",
      "webp_lg": "https://bucket.s3.region.amazonaws.com/actors/.../poster_lg.webp"
    }
  },
  "message": "Poster frame regenerated successfully"
}
```

### Python Script

**Location**: `/scripts/regenerate_poster_frame.py`

**Workflow**:
1. **Generate poster frame** via RunPod using `PosterFrameGenerator`
2. **Download** generated image from temporary S3 URL
3. **Convert to WebP** in 3 sizes (sm: 256x256, md: 512x512, lg: 1024x1024)
4. **Upload to S3** at proper paths
5. **Update actorsData.json** with new poster frame URLs

**S3 Path Structure**:
```
actors/{actor_name}/poster_frame/
├── {actor_name}_poster_sm.webp   (256x256)
├── {actor_name}_poster_md.webp   (512x512)
└── {actor_name}_poster_lg.webp   (1024x1024)
```

### Frontend Components

#### ActorCard Component

**Location**: `/ui/src/components/ActorCard.tsx`

**Changes**:
- Added `onRegeneratePosterFrame` prop
- Added `regenerating` state
- Added `handleRegeneratePosterFrame()` function with confirmation dialog
- Added "🎨 Regenerate Poster" button in actions section
- Button shows "⏳ Generating..." during regeneration

**UI Features**:
- Toast notification when regeneration starts
- Disabled state during regeneration
- Loading indicator
- Toast notifications for success/error

#### ActorsGrid Component

**Location**: `/ui/src/components/ActorsGrid.tsx`

**Changes**:
- Added `handleRegeneratePosterFrame()` function
- Calls API endpoint with actor data
- Reloads actors data after successful regeneration
- Shows success alert
- Passes handler to ActorCard components

## User Flow

1. **User clicks "🎨 Regenerate Poster" button** on actor card
2. **Toast notification appears**: "Regenerating poster frame for {actor_name}..."
3. **Button shows loading state**: "⏳ Generating..."
4. **Backend workflow executes**:
   - Generates poster frame via RunPod (15-60 seconds)
   - Downloads and converts to WebP (sm, md, lg)
   - Uploads all versions to S3
   - Updates actorsData.json
5. **Frontend updates**:
   - Reloads actors data
   - New poster frame appears immediately
   - Success toast notification shown
6. **Button returns to normal state**: "🎨 Regenerate Poster"

## Technical Details

### Image Processing

**WebP Conversion**:
```python
def generate_webp_versions(image_bytes: bytes) -> dict:
    sizes = {
        'sm': (256, 256),
        'md': (512, 512),
        'lg': (1024, 1024)
    }
    
    for size_name, (width, height) in sizes.items():
        resized = img.copy()
        resized.thumbnail((width, height), Image.Resampling.LANCZOS)
        resized.save(output, format='WEBP', quality=85, method=6)
```

**Quality Settings**:
- Quality: 85 (good balance between size and quality)
- Method: 6 (best compression)
- Resampling: LANCZOS (high-quality downscaling)

### S3 Upload

**URL Formats**:
- **Accelerated**: `https://{bucket}.s3-accelerate.amazonaws.com/{key}`
- **Standard**: `https://{bucket}.s3.{region}.amazonaws.com/{key}`

**Content Type**: `image/webp`

**Bucket**: From `AWS_USER_IMAGES_BUCKET` environment variable

### Data Update

**actorsData.json Structure**:
```json
{
  "id": 1,
  "name": "0001_european_20_female",
  "poster_frames": {
    "accelerated": {
      "webp_sm": "...",
      "webp_md": "...",
      "webp_lg": "..."
    },
    "standard": {
      "webp_sm": "...",
      "webp_md": "...",
      "webp_lg": "..."
    }
  }
}
```

## Error Handling

### Frontend
- Toast notifications provide non-intrusive feedback
- Loading state prevents multiple simultaneous requests
- Toast messages show clear success/error states
- Console logging for debugging

### Backend
- Validates request body
- Catches Python script errors
- Returns detailed error messages
- Logs all steps for debugging

### Python Script
- Try-catch around entire workflow
- Detailed logging at each step
- JSON error responses
- Exit code 1 on failure

## Performance

**Total Time**: ~20-70 seconds
- Poster frame generation: 15-60s (RunPod)
- Image download: 1-2s
- WebP conversion: 1-2s (3 sizes)
- S3 upload: 2-5s (3 files)
- Data update: <1s

**Optimization**:
- Parallel WebP generation possible
- Parallel S3 uploads possible
- Could cache generated images

## Testing

### Manual Testing Steps

1. **Start the UI server**:
   ```bash
   cd ui
   npm run dev
   ```

2. **Navigate to Actor Library**

3. **Click "🎨 Regenerate Poster" on any actor**

4. **Confirm the dialog**

5. **Wait for completion** (~20-70 seconds)

6. **Verify**:
   - New poster frame appears
   - Success alert shown
   - Image quality is good
   - All sizes generated (check S3)

### Environment Variables Required

```bash
# RunPod
RUNPOD_API_KEY=your_key

# AWS S3
AWS_ACCESS_KEY=your_key
AWS_ACCESS_SECRET=your_secret
AWS_REGION=us-west-1
AWS_USER_IMAGES_BUCKET=your_bucket
```

## Files Modified

### Backend
- `/ui/config/routes/actors-api.ts` - Added API route and handler

### Frontend
- `/ui/src/components/ActorCard.tsx` - Added regenerate button and logic
- `/ui/src/components/ActorsGrid.tsx` - Added handler function

### Scripts
- `/scripts/regenerate_poster_frame.py` - **NEW**: Main regeneration script

## Future Enhancements

### Possible Improvements
- [ ] Batch regeneration for multiple actors
- [ ] Progress indicator with percentage
- [ ] Preview before replacing
- [ ] Undo/revert functionality
- [ ] Custom style selection
- [ ] Custom parameters (steps, guidance, etc.)
- [ ] Background processing (don't block UI)
- [ ] WebSocket updates for real-time progress
- [ ] Image comparison (old vs new)
- [ ] History/versions

### Performance Optimizations
- [ ] Parallel WebP generation
- [ ] Parallel S3 uploads
- [ ] Image caching
- [ ] CDN integration
- [ ] Lazy loading for actor grid

## Troubleshooting

### Button Not Appearing
- Check if `onRegeneratePosterFrame` prop is passed
- Verify ActorsGrid is passing the handler

### Generation Fails
- Check RunPod API key
- Verify AWS credentials
- Check S3 bucket exists
- Review Python script logs
- Check actor has LoRA model

### Image Not Updating
- Check actorsData.json was updated
- Verify S3 URLs are correct
- Clear browser cache
- Check image URLs in network tab

### Slow Generation
- Normal: 20-70 seconds
- Check RunPod queue status
- Verify network connection
- Check S3 upload speed

## Conclusion

The poster frame regeneration feature is now fully integrated into the Actor Library UI. Users can easily regenerate poster frames with a single click, and the system handles all the complexity of generation, conversion, upload, and data updates automatically.

**Status**: ✅ **COMPLETE AND READY TO USE**
