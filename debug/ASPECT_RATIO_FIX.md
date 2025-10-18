# Aspect Ratio Bug Fix - Training Image Generation

## Issue
When selecting "16:9 Cinematic" aspect ratio in the Training Data tab, generated images were still coming back as 1:1 (square) instead of 16:9.

## Root Cause
**Positional argument mismatch** between TypeScript backend and Python script.

The backend was conditionally adding optional arguments:
```typescript
const args = [scriptPath, actorId, actor_name, imageUrl, prompt];
if (actor_type) args.push(actor_type);
if (actor_sex) args.push(actor_sex);
if (aspect_ratio) args.push(aspect_ratio);
```

**Problem**: If `actor_type` or `actor_sex` were undefined, the `aspect_ratio` would end up in the wrong position!

Example:
- Frontend sends: `aspect_ratio: "16:9"`
- Backend builds: `[scriptPath, actorId, name, url, prompt, "16:9"]`
- Python reads: `argv[5] = "16:9"` (thinks it's `actor_type`, not `aspect_ratio`!)
- Result: aspect_ratio defaults to "1:1"

## Solution
Always pass all positional arguments with defaults:

```typescript
const args = [
  scriptPath, 
  actorId, 
  actor_name, 
  imageUrl, 
  prompt,
  actor_type || 'person',  // Default to 'person' if not provided
  actor_sex || '',         // Empty string if not provided
  aspect_ratio || '1:1'    // Default to '1:1' if not provided
];
```

Python script updated to handle empty strings:
```python
actor_type = sys.argv[5] if len(sys.argv) > 5 and sys.argv[5] else "person"
actor_sex = sys.argv[6] if len(sys.argv) > 6 and sys.argv[6] else None
aspect_ratio = sys.argv[7] if len(sys.argv) > 7 and sys.argv[7] else "1:1"
```

## Verification
The Replicate API works correctly - confirmed by manual test showing 16:9 output from 1:1 input when aspect_ratio parameter is properly passed.

## Files Modified
- `/home/markus/actor_maker/ui/config/routes/actors/image-generation.handlers.ts`
- `/home/markus/actor_maker/scripts/training_data/generate_single_training_image_s3.py`
- `/home/markus/actor_maker/src/replicate_service.py` (added logging and documentation)

## Testing
1. Select an actor with a base image
2. Open Training Data tab
3. Click "Generate Training Images"
4. Select "16:9 Cinematic" aspect ratio
5. Generate an image
6. Verify output is 16:9 (approximately 1920x1080 or similar wide format)

## Date
October 18, 2025
