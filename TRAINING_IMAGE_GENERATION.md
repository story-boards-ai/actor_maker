# Training Image Generation with Replicate Kontext

## Overview
Implemented single training image generation using Replicate flux-kontext-pro integration with preset prompts. Users can now generate individual training images on-demand from the Training Data Manager.

## Features

### ✨ Single Image Generation
- **Preset Prompts**: 8 curated prompts across 3 categories:
  - **Photorealistic** (2): Rain-slick street run, window light close-up
  - **B&W Stylized** (3): Pen & ink, charcoal, woodcut styles
  - **Color Stylized** (3): Comic book, watercolor, gouache styles
- **Smart Descriptor**: Automatically uses "man", "woman", or "person" based on actor sex
- **Replicate Integration**: Uses flux-kontext-pro for high-quality generation
- **Auto-save**: Saves locally and uploads to S3 automatically
- **Manifest Update**: Updates response.json with new image URLs

### 🎨 UI Components
- **Generate Button**: "✨ Generate Single Image" in header toolbar
- **Prompt Selector**: Radix UI Select dropdown with category labels
- **Prompt Preview**: Shows full prompt text before generation
- **Progress Indicator**: Spinner and status messages during generation
- **Auto-reload**: Grid refreshes automatically after successful generation

## Implementation

### Backend

#### Python Script
**File**: `/scripts/generate_single_training_image.py`
- Loads base image and converts to base64
- Calls Replicate flux-kontext-pro API
- Saves generated image locally with auto-incrementing index
- Uploads to S3 with proper key structure
- Updates response.json manifest

#### API Endpoints
**File**: `/ui/config/routes/actors-api.ts`

1. **GET `/api/actors/:actorId/training-prompts`**
   - Returns available prompts for actor
   - Determines descriptor based on actor sex
   - Returns 8 preset prompts with labels and categories

2. **POST `/api/actors/:actorId/training-data/generate-single`**
   - Accepts: actor_name, base_image_path, prompt
   - Spawns Python script with parameters
   - Returns: success, local_path, s3_url, filename, index

### Frontend

#### TrainingImageModal Enhancement
**File**: `/ui/src/components/ActorTrainingDataManager/TrainingImageModal.tsx`

**Dual Mode Support**:
- **Viewer Mode**: Shows existing training image (original behavior)
- **Generator Mode**: Shows prompt selector and generation UI (new)

**Generator Features**:
- Radix UI Select for prompt selection
- Prompt preview panel
- Generate button with loading state
- Success/error message display
- Auto-close after successful generation

#### ActorTrainingDataManager Updates
**File**: `/ui/src/components/ActorTrainingDataManager/ActorTrainingDataManager.tsx`

**Changes**:
- Added "✨ Generate Single Image" button
- Renamed batch button to "🎲 Generate Batch (20)"
- Added `showGenerateModal` state
- Pass required props to TrainingImageModal (actorId, actorName, baseImagePath)
- Added second TrainingImageModal instance for generator mode

## Usage

### User Flow
1. Open Training Data Manager for an actor
2. Click "✨ Generate Single Image" button
3. Select desired prompt from dropdown
4. Review prompt preview
5. Click "✨ Generate Image"
6. Wait for generation (shows spinner and progress)
7. Image automatically saved locally and uploaded to S3
8. Grid refreshes to show new image

### Prompt Categories

**Photorealistic**:
- Action scenes with dramatic lighting
- Close-up character shots
- Cinematic compositions

**B&W Stylized**:
- Pen & ink line drawings
- Charcoal sketches
- Woodcut prints

**Color Stylized**:
- Comic book illustrations
- Watercolor paintings
- Gouache paintings

## Technical Details

### File Structure
```
/scripts/generate_single_training_image.py  # Python generation script
/ui/config/routes/actors-api.ts             # Backend API endpoints
/ui/src/components/ActorTrainingDataManager/
  ├── ActorTrainingDataManager.tsx          # Main manager component
  └── TrainingImageModal.tsx                # Modal with generator
```

### S3 Storage
- **Bucket**: `AWS_SYSTEM_ACTORS_BUCKET` (story-boards-assets)
- **Key Pattern**: `system_actors/training_data/{actor_name}/{filename}`
- **Local Path**: `data/actors/{actor_name}/training_data/{filename}`

### Filename Convention
- Pattern: `{actor_name}_{index}.jpg`
- Index: Auto-incremented from existing files
- Example: `0000_european_16_male_5.jpg`

### Dependencies
- **Replicate API**: flux-kontext-pro model
- **Radix UI**: Select component for prompt picker
- **Python**: replicate, boto3, requests libraries

## Environment Variables Required
```bash
REPLICATE_API_TOKEN=your_token_here
AWS_SYSTEM_ACTORS_BUCKET=story-boards-assets
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
```

## Benefits

### For Users
- ✅ **Quick Generation**: Single images on-demand
- ✅ **Preset Quality**: Curated prompts ensure good results
- ✅ **No Manual Work**: Auto-save and upload
- ✅ **Flexible**: Choose specific styles/scenes

### For Training
- ✅ **Diverse Dataset**: Mix of photorealistic and stylized
- ✅ **Consistent Quality**: Replicate flux-kontext-pro
- ✅ **Identity Preservation**: Prompts designed to maintain features
- ✅ **Style Variety**: Multiple artistic styles for better LoRA

## Future Enhancements
- [ ] Custom prompt input option
- [ ] Batch generation with multiple prompts
- [ ] Preview before saving
- [ ] Upscaling integration
- [ ] Progress tracking for long generations
- [ ] Prompt history/favorites
