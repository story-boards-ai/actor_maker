# Base Image Generation API

## Overview

This API generates professional full-body portrait base images for actors using FLUX and the `normal_image_v4_workflow.json`. These base images follow the established pattern observed in existing actor base images:

- **Full-body portrait** (head to toe visible)
- **Neutral studio background** (gray or beige)
- **Professional lighting** (no harsh shadows)
- **Centered composition**
- **Natural pose** (relaxed, facing camera)
- **High quality** (photorealistic, sharp focus)

## API Endpoint

### POST `/api/generate-base-image`

Generate a new base image for an actor based on character description.

#### Request Body

```typescript
{
  actorName: string;      // Required: Actor folder name (e.g., "0100_european_25_male")
  description: string;    // Required: Character description
  width?: number;         // Optional: Image width (default: 1024)
  height?: number;        // Optional: Image height (default: 1536)
  steps?: number;         // Optional: Sampling steps (default: 25)
  seed?: number;          // Optional: Random seed (default: -1 for random)
}
```

#### Example Request

```javascript
const response = await fetch('/api/generate-base-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    actorName: '0100_european_25_male',
    description: 'european 25 year old male with short brown hair and blue eyes',
    width: 1024,
    height: 1536,
    steps: 25,
    seed: -1
  })
});

const result = await response.json();
```

#### Response

```typescript
{
  status: "COMPLETED" | "FAILED";
  output?: {
    // RunPod response with image data
    job_results?: {
      images: string[];  // Base64 encoded images
    }
  };
  localPath?: string;    // Path to saved image (e.g., "/data/actors/0100_european_25_male/base_image/0100_european_25_male_base.png")
  filename?: string;     // Saved filename (e.g., "0100_european_25_male_base.png")
  seed?: number;         // Actual seed used
  metadata?: {
    actor_name: string;
    description: string;
    width: number;
    height: number;
    steps: number;
    prompt: string;      // Full generated prompt
  };
  error?: string;        // Error message if failed
}
```

## File Structure

Generated base images are automatically saved to:

```
/data/actors/{actorName}/base_image/{actorName}_base.png
```

Example:
```
/data/actors/0100_european_25_male/base_image/0100_european_25_male_base.png
```

This follows the established naming convention where all base images use the `{actorName}_base.png` format.

## Python Script

You can also generate base images directly using the Python script:

```bash
python scripts/generate_base_image.py <actor_name> <description> [width] [height] [steps] [seed]
```

### Example

```bash
python scripts/generate_base_image.py \
  "0100_european_25_male" \
  "european 25 year old male with short brown hair" \
  1024 \
  1536 \
  25 \
  -1
```

## Character Description Guidelines

For best results, include:

1. **Ethnicity/Appearance**: "european", "asian", "black", "south american", etc.
2. **Age**: Specific age or age range
3. **Gender**: "male" or "female"
4. **Distinctive Features**: Hair color, eye color, facial features, body type

### Good Examples

- `"european 25 year old male with short brown hair and blue eyes"`
- `"black 35 year old female with curly hair and warm smile"`
- `"asian 21 year old female with long black hair"`
- `"south american 30 year old male with beard and athletic build"`

### Bad Examples

- `"person"` (too generic)
- `"john smith"` (names don't help)
- `"superhero"` (too stylized, not photorealistic)

## Technical Details

### Workflow

The system uses the **FLUX Dev** model with the `normal_image_v4_workflow.json`:

- **Model**: `flux1-dev-fp8`
- **Sampler**: `euler`
- **Scheduler**: `simple`
- **FLUX Guidance**: `3.5`
- **No LoRAs**: Base images are generated without any LoRAs for maximum flexibility

### Prompt Template

The API automatically constructs a detailed prompt optimized for base images:

```
Professional full-body studio portrait photograph of a {description}.
Standing pose, facing camera, centered in frame.
Neutral gray or beige studio background with professional lighting.
Natural relaxed pose with arms at sides or casually positioned.
Sharp focus, high quality, photorealistic.
Full body visible from head to toe.
Casual to semi-formal attire appropriate for the character.
Direct eye contact with camera or slight angle.
Clean composition, no distracting elements.
```

### Dimensions

**Recommended dimensions for base images:**

- **Portrait (default)**: 1024x1536 (2:3 aspect ratio)
  - Good for full-body portraits
  - Matches typical actor base image proportions

- **Alternative**: 1360x768 (16:9 aspect ratio)
  - Wider composition
  - May cut off feet in full-body shots

### Quality Settings

- **Steps**: 25 (default)
  - Higher quality than typical generation (20 steps)
  - Ensures sharp, detailed base images
  - Can increase to 30-35 for even higher quality

- **Seed**: -1 (random)
  - Use specific seed to reproduce exact results
  - Useful for iterating on a good generation

## Integration Example

```typescript
// React component example
async function generateActorBaseImage(actorName: string, description: string) {
  try {
    const response = await fetch('/api/generate-base-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actorName,
        description,
        width: 1024,
        height: 1536,
        steps: 25
      })
    });
    
    const result = await response.json();
    
    if (result.status === 'COMPLETED') {
      console.log('Base image saved to:', result.localPath);
      console.log('Seed used:', result.seed);
      return result;
    } else {
      console.error('Generation failed:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
}
```

## Error Handling

Common errors and solutions:

### "Missing required fields"
- Ensure both `actorName` and `description` are provided

### "RunPod error"
- Check RunPod API key is configured
- Verify RunPod serverless endpoint is available
- Check network connectivity

### "No response from RunPod"
- RunPod service may be down
- Check RUNPOD_SERVER_100_ID environment variable

### "Generation failed"
- Prompt may be too complex or contradictory
- Try simplifying the description
- Check RunPod logs for detailed error

## Environment Variables Required

```bash
RUNPOD_API_KEY=your_api_key_here
RUNPOD_SERVER_100_ID=your_endpoint_id_here
```

## Files Created/Modified

### New Files
- `/scripts/generate_base_image.py` - Python script for generation
- `/ui/config/routes/base-image-api.ts` - API route handler
- `/docs/BASE_IMAGE_GENERATION.md` - This documentation

### Modified Files
- `/ui/config/server-plugin.ts` - Added base image API to middleware chain
- `/data/actors/.gitignore` - Updated to allow base images to be viewed

## Next Steps

After generating a base image:

1. **Review the image** - Check quality, composition, and accuracy
2. **Regenerate if needed** - Use different seed or adjust description
3. **Generate training data** - Use the base image to create training variations
4. **Train LoRA** - Train the actor's LoRA model with the training data

## See Also

- [Training Data Generation](./TRAINING_DATA_GENERATION.md)
- [LoRA Training](./LORA_TRAINING.md)
- [Workflow Documentation](../workflows/README.md)
