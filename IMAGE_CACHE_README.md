# Image Cache System

## Overview

The Actor Maker UI now includes a comprehensive image caching and prefetching system that dramatically improves loading performance for S3-hosted training images.

## Architecture

### Core Components

1. **ImageCacheService** (`ui/src/utils/imageCache.ts`)
   - Manages local disk cache for S3 images
   - Tracks cached images in manifest file
   - Provides cache invalidation and statistics

2. **PrefetchManager** (`ui/src/utils/prefetchManager.ts`)
   - Background prefetching with priority queue
   - High-priority prefetch for currently viewed actors
   - Normal-priority prefetch for all other actors
   - Non-blocking operation

3. **Backend Cache API** (`ui/config/routes/cache/`)
   - Downloads and caches S3 images locally
   - Serves cached images with 1-year cache headers
   - Manages cache manifest and cleanup

4. **CachedImage Component** (`ui/src/components/CachedImage.tsx`)
   - Drop-in replacement for `<img>` tags
   - Automatically uses cached URLs when available
   - Falls back to S3 URLs if cache miss

## How It Works

### On App Startup

1. **Background Prefetching Starts**
   - When actors load, `prefetchManager.startPrefetch(actors)` is called
   - Builds queue of all actors with uncached images
   - Processes queue in background (non-blocking)
   - Continues until all actors are cached

### When Opening Actor Training Data

1. **High-Priority Prefetch**
   - Current actor's images are added to front of queue
   - Prefetch manager processes them immediately
   - Other actors continue in background

2. **Instant Loading**
   - `CachedImage` component checks cache first
   - If cached: serves from local disk (instant)
   - If not cached: shows S3 URL while prefetching

### Cache Storage

```
.image-cache/
├── manifest.json          # Cache metadata
└── images/
    ├── 0001/              # Actor ID
    │   ├── 0001_abc123.jpg
    │   └── 0001_def456.jpg
    └── 0002/
        └── 0002_xyz789.jpg
```

### Manifest Structure

```json
{
  "version": "1.0",
  "last_updated": 1729176000000,
  "entries": {
    "https://s3.../image.jpg": {
      "s3_url": "https://s3.../image.jpg",
      "local_path": ".image-cache/images/0001/0001_abc123.jpg",
      "cached_at": 1729176000000,
      "size_bytes": 328059,
      "actor_id": "0001",
      "filename": "0001_european_16_male_0.jpg",
      "etag": "\"abc123...\""
    }
  }
}
```

## API Endpoints

### GET /api/cache/manifest
Returns cache manifest with all cached images.

### GET /api/cache/image?path=...
Serves cached image from local disk.

### GET /api/cache/exists?path=...
Checks if cache file exists.

### POST /api/cache/prefetch
```json
{
  "actor_id": "0001",
  "images": [
    { "s3_url": "https://...", "filename": "image.jpg" }
  ]
}
```
Downloads and caches images for an actor.

### POST /api/cache/invalidate
```json
{
  "s3_url": "https://..."
}
```
Removes image from cache (called when image is deleted).

### POST /api/cache/clear/:actorId
Clears all cached images for specific actor.

### POST /api/cache/clear-all
Clears entire cache.

## Usage

### In Components

```tsx
import { CachedImage } from '../components/CachedImage';

function MyComponent() {
  return (
    <CachedImage
      s3_url="https://s3.amazonaws.com/..."
      alt="Training image"
      loading="lazy"
      style={{ maxWidth: '100%' }}
    />
  );
}
```

### Manual Prefetching

```tsx
import { prefetchManager } from '../utils/prefetchManager';

// Prefetch specific actor (high priority)
await prefetchManager.prefetchActor(actorId, images);

// Get progress
const progress = prefetchManager.getProgress();
console.log(`${progress.completed}/${progress.total} actors cached`);

// Pause/resume
prefetchManager.pause();
prefetchManager.resume();
```

### Cache Management

```tsx
import { imageCache } from '../utils/imageCache';

// Get cache stats
const stats = await imageCache.getStats();
console.log(`${stats.total_entries} images, ${stats.total_size_mb}MB`);

// Clear actor cache
await imageCache.clearActorCache(actorId);

// Invalidate specific image
await imageCache.invalidate(s3_url);
```

## Cache Invalidation

Cache is automatically invalidated when:

1. **Image Deleted**: When user deletes training image
2. **Manual Clear**: Via cache management functions
3. **Actor Deleted**: When actor is removed (if implemented)

## Performance Benefits

### Before Caching
- **First Load**: 2-5 seconds per image (S3 download)
- **Subsequent Loads**: 2-5 seconds (no browser cache for S3)
- **Total Load Time**: 50+ seconds for 25 images

### After Caching
- **First Load**: 2-5 seconds (downloads in background)
- **Cached Load**: <100ms (local disk)
- **Total Load Time**: <2 seconds for 25 images (if cached)

## Configuration

### Cache Location
- **Directory**: `.image-cache/` (gitignored)
- **Manifest**: `.image-cache/manifest.json`
- **Images**: `.image-cache/images/{actorId}/`

### Prefetch Behavior
- **Priority**: High (current actor) > Normal (other actors)
- **Concurrency**: Sequential (one actor at a time)
- **Delay**: 100ms between actors (avoid overwhelming system)

## Troubleshooting

### Cache Not Working

1. Check backend is serving cache API:
   ```bash
   curl http://localhost:5173/api/cache/manifest
   ```

2. Check cache directory exists:
   ```bash
   ls -la .image-cache/
   ```

3. Check browser console for errors

### Images Not Caching

1. Verify S3 URLs are accessible
2. Check network tab for failed downloads
3. Verify manifest is updating:
   ```bash
   cat .image-cache/manifest.json | jq '.entries | length'
   ```

### Clear Cache

```bash
# Via API
curl -X POST http://localhost:5173/api/cache/clear-all

# Or manually
rm -rf .image-cache/
```

## Future Enhancements

- [ ] Cache size limits (auto-cleanup old entries)
- [ ] Cache compression (reduce disk usage)
- [ ] Service worker for offline support
- [ ] Cache warming on app startup
- [ ] Cache analytics and monitoring
- [ ] Differential sync (only download changed images)
- [ ] Multi-threaded prefetching
- [ ] Cache preloading based on usage patterns

## Technical Details

### Why Not Browser Cache?

S3 URLs often have query parameters and short cache headers, making browser caching unreliable. Local disk cache provides:

- Persistent storage across sessions
- Full control over cache invalidation
- Faster access than network requests
- Works offline (if cached)

### Why Background Prefetching?

- **Non-blocking**: App remains responsive during prefetch
- **Priority-based**: Current actor loads first
- **Efficient**: Avoids redundant downloads
- **Smart**: Only caches what's needed

### Security Considerations

- Cache directory is gitignored
- Cache paths are validated (no directory traversal)
- S3 URLs are not modified (integrity preserved)
- Cache serves with proper content types
