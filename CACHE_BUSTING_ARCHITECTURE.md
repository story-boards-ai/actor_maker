# Image Cache-Busting Architecture

## Overview

This document describes the comprehensive cache-busting and event-driven architecture implemented to prevent browser caching of dynamically updated images in the Styles Maker application.

## Problem Statement

1. **Browser Caching Issue**: Browsers aggressively cache images, causing stale images to be displayed when training images are regenerated or updated.
2. **Cross-Component Synchronization**: When saving a generated image as a training image in the Image Generator tab, the Training Data Manager tab needs to refresh without page reload.

## Solution Architecture

### 1. Cache-Busting System (`/ui/src/utils/imageCaching.ts`)

**Core Function: `addCacheBustingParam(url, forceRefresh)`**
- Adds timestamp query parameter (`_t=timestamp`) to image URLs
- Forces browser to fetch fresh images instead of using cached versions
- Smart handling:
  - Skips data URLs and external HTTP(S) URLs
  - Preserves existing timestamps if `forceRefresh` is false
  - Always adds new timestamp if `forceRefresh` is true

**Usage Pattern**:
```typescript
// Standard cache busting (preserves existing timestamp)
<img src={addCacheBustingParam(imagePath)} />

// Force refresh (always new timestamp)
<img src={addCacheBustingParam(imagePath, true)} />
```

### 2. Event Bus System (`/ui/src/utils/eventBus.ts`)

**Purpose**: Cross-component communication without prop drilling

**Event Types**:
- `TRAINING_IMAGE_SAVED`: Fired when generated image is saved as training image
- `TRAINING_IMAGE_DELETED`: Fired when training image is deleted
- `TRAINING_IMAGES_GENERATED`: Fired when batch generation completes

**Usage Pattern**:
```typescript
// Emit event
eventBus.emit(EVENT_TYPES.TRAINING_IMAGE_SAVED, {
  styleId: 'abc123',
  baseImageFilename: 'input_001.jpg',
  trainingImagePath: '/path/to/training/image.jpg'
});

// Listen for event
const unsubscribe = eventBus.on(
  EVENT_TYPES.TRAINING_IMAGE_SAVED,
  (data) => {
    if (data.styleId === currentStyleId) {
      refreshImages();
    }
  }
);

// Cleanup on unmount
return () => unsubscribe();
```

## Implementation Details

### Components Updated with Cache-Busting

#### 1. **ImageGenerator** (`/ui/src/components/ImageGenerator/`)
- **ImageComparison.tsx**: Cache-busts source and generated images
- **ImageGenerator.tsx**: Emits `TRAINING_IMAGE_SAVED` event after successful save

#### 2. **TrainingDataManager** (`/ui/src/components/TrainingDataManager.tsx`)
- **Base images**: Cache-busted on display
- **Training images**: Force-refreshed (always new timestamp)
- **Event listeners**: Listens for save/delete/generate events and auto-refreshes
- **Event emission**: Emits `TRAINING_IMAGE_DELETED` when deleting images

#### 3. **Image Selection Modals**
- **ImageSelectorModal.tsx**: All image previews cache-busted
- **StyleSelectorModal.tsx**: All style preview images cache-busted

#### 4. **TrainingDataViewer** (`/ui/src/components/TrainingDataViewer.tsx`)
- All training image displays cache-busted

### Data Flow: Save Generated Image as Training Image

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. User clicks "Save as Training Image" in ImageGenerator          │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────────────┐
│ 2. handleSaveAsTrainingImage() sends POST to backend              │
│    - baseImageFilename: "input_001.jpg"                            │
│    - generatedImageUrl: data URL or file path                      │
│    - styleId: UUID                                                  │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────────────┐
│ 3. Backend API (/api/training-data/save-generated)                │
│    - Decodes/downloads generated image                             │
│    - Saves to: /resources/style_images/{styleId}_{title}/         │
│    - Filename: {basename}_training.jpg                             │
│    - Links to base image via filename                              │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────────────┐
│ 4. Success response received                                        │
│    - Log success message                                            │
│    - Emit TRAINING_IMAGE_SAVED event with:                         │
│      * styleId                                                      │
│      * baseImageFilename                                            │
│      * trainingImagePath                                            │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────────────┐
│ 5. TrainingDataManager listens for event                           │
│    - Checks if event.styleId matches current style                 │
│    - If match: calls loadData() to refresh                         │
│    - No loading screen shown (seamless refresh)                    │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────────────┐
│ 6. Images refreshed with cache-busting                             │
│    - imageRefreshKey incremented                                    │
│    - New timestamp added to all image URLs                         │
│    - Training image appears instantly with correct link to base    │
└─────────────────────────────────────────────────────────────────────┘
```

### Backend Integration

**Save Generated Image Endpoint** (`/ui/vite.config.ts` line 888):
```
POST /api/training-data/save-generated
Body: {
  styleId: string,
  baseImageFilename: string,
  generatedImageUrl: string (data URL, file path, or HTTP URL)
}

Response: {
  success: true,
  filename: string,
  path: string
}
```

**Linking Logic**:
1. Backend extracts base filename: `input_001.jpg` → `input_001`
2. Creates training filename: `input_001_training.jpg`
3. Saves to style's training directory
4. TrainingDataManager maps training images to base images by matching filenames

## Key Features

### ✅ Zero Browser Caching
- All images include timestamp query parameters
- Training images use `forceRefresh=true` for guaranteed freshness
- Base images preserve timestamps for stability

### ✅ Cross-Component Synchronization
- Event bus enables communication without tight coupling
- Multiple components can react to same event
- Automatic cleanup prevents memory leaks

### ✅ Seamless User Experience
- No page reloads required
- No visible loading states for refreshes
- Instant feedback when saving images

### ✅ Robust Error Handling
- Failed saves don't break the UI
- Clear error messages in logs
- Graceful degradation if events fail

### ✅ Performance Optimized
- Selective refreshes (only matching styleId)
- Preserved timestamps when not forcing refresh
- Efficient event cleanup on unmount

## Testing Recommendations

1. **Save Generated Image**:
   - Generate image in Image Generator tab
   - Click "Save as Training Image"
   - Switch to Training Data Manager tab
   - Verify training image appears without reload

2. **Cache Busting Verification**:
   - Open browser DevTools Network tab
   - Generate and save training image
   - Verify new request is made (not from cache)
   - Check URL includes `?_t=` timestamp

3. **Cross-Tab Updates**:
   - Open Training Data Manager in one tab
   - Open Image Generator in another tab
   - Save image from Generator
   - Verify Manager updates automatically

4. **Error Handling**:
   - Disconnect network
   - Try to save training image
   - Verify error message appears
   - Verify UI remains functional

## Future Enhancements

1. **Optimistic UI Updates**: Show training image immediately before backend confirms
2. **WebSocket Integration**: Real-time updates for batch generation progress
3. **Image Versioning**: Track history of training image changes
4. **Undo/Redo**: Allow reverting to previous training images

## Maintenance Notes

- Cache-busting utilities are centralized in `/utils/imageCaching.ts`
- Event types are strongly typed via TypeScript interfaces
- All event listeners include cleanup in useEffect return
- Image refresh key increments on every data reload
