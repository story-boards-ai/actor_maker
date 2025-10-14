# Training Data Management System

## Overview

The Training Data Management System provides a comprehensive workflow for generating styled training images from base images using img2img processing. It features an atomic queuing system similar to the Prompt generation system, with batch processing, individual image management, and seamless integration with your existing style library.

## Architecture

### Components

#### 1. **Python Backend** (`scripts/generate_training_images.py`)
- Batch processes base images through img2img workflow
- Uses style-specific settings (saved per style)
- Encodes images to base64 for RunPod submission
- Integrates Prompts into prompts with style-specific padding
- Returns structured results for each processed image

#### 2. **API Endpoints** (vite.config.ts)

**POST `/api/training-data/generate`**
- Batch generates training images from base images
- Accepts: images, workflow, settings, style metadata
- Automatically saves successful images to style folders
- Returns: success/failure status for each image

**POST `/api/training-data/delete`**
- Deletes a specific training image
- Base image remains intact
- Returns: success status

**GET `/api/styles/{styleId}/training-images?version={v1|v2}`**
- v1: Returns generated training images for a style
- v2: Returns base input images with Prompt status

#### 3. **TrainingDataManager Component**

**Features:**
- Side-by-side view of base images and training images
- Batch selection and processing
- Individual image actions (generate, delete, recreate)
- Send images to Image Generation tab for manual editing
- Progress tracking with abort capability
- Automatic reload after operations

**UI Elements:**
- Header with statistics and batch actions
- Selection toolbar (Select All, Select Missing, Deselect All)
- Grid of image pairs (base + training)
- Per-image action buttons
- Progress bar during batch operations

## User Workflows

### Workflow 1: Generate Missing Training Images

1. **Open Training Data Manager**
   - Click "🎨 Manage Training Data" on a style card
   
2. **Generate Missing**
   - Click "✨ Generate Missing (X)" button
   - System processes all base images without training images
   - Uses saved style settings or defaults
   - Shows progress bar during generation
   
3. **Result**
   - Training images saved to `/resources/style_images/{styleId}_{styleName}/`
   - Grid automatically updates to show new images

### Workflow 2: Batch Process Selected Images

1. **Select Base Images**
   - Check boxes on images you want to process
   - Or use "Select Missing" to auto-select all without training images
   
2. **Generate Selected**
   - Click "Generate Selected (X)" button
   - Confirm the batch operation
   
3. **Monitor Progress**
   - Progress bar shows current image / total images
   - Abort button available to stop processing
   
4. **View Results**
   - Successfully processed images appear next to base images
   - Failed images remain selectable for retry

### Workflow 3: Individual Image Management

**For each image pair:**

**Generate (missing training image)**
- Click "✨ Generate" on placeholder
- Single image processed immediately

**Recreate (existing training image)**
- Click "🔄 Recreate" button
- Regenerates training image with current settings
- Useful after updating style settings

**Delete (existing training image)**
- Click "🗑️ Delete" button
- Removes training image
- Base image becomes visible again
- Can regenerate from scratch

**Edit (manual refinement)**
- Click "🎨 Edit" button
- Switches to Image Generation tab
- Loads base image and training image for comparison
- Allows manual tweaking of settings

### Workflow 4: Update Style Settings

1. **Edit Settings in Image Generation Tab**
   - Adjust denoise, steps, cfg, guidance, etc.
   - Click "Save Settings" for the style
   
2. **Return to Training Data Manager**
   - Settings are automatically loaded per style
   - Recreate images to apply new settings

## File Structure

```
actor_maker/
├── scripts/
│   └── generate_training_images.py       # Batch processing script
├── ui/
│   ├── src/
│   │   └── components/
│   │       ├── TrainingDataManager.tsx   # Main component
│   │       └── TrainingDataManager.css   # Styling
│   └── vite.config.ts                    # API endpoints
├── resources/
│   ├── input_images/                     # Base images (v2)
│   │   ├── image_001.jpg
│   │   └── image_001.txt                 # Prompt file
│   └── style_images/
│       └── {styleId}_{styleName}/        # Training images (v1)
│           └── image_001_training.jpg    # Generated training image
└── workflows/
    └── img2img_workflow.json             # ComfyUI workflow template
```

## Data Flow

### Image Generation Flow

```
1. User selects base images
2. TrainingDataManager component gathers:
   - Base image paths
   - Prompts from .txt files
   - Style metadata (LoRA, weights, prompts)
   - Saved settings (or defaults)
3. API receives batch request
4. Python script:
   - Encodes each base image to base64
   - Builds prompt: frontpad + Prompt + backpad
   - Updates workflow nodes with settings
   - Calls RunPod serverless endpoint
   - Returns results
5. API saves successful images to style folder
6. Component reloads and displays new training images
```

### Settings Persistence

**Per-Style Settings:**
- Saved to: `/debug/img2img_settings_{styleId}.json`
- Includes: seed, steps, cfg, denoise, guidance, dimensions, sampler, scheduler
- Automatically loaded when generating for that style
- Updated via Image Generation tab "Save Settings" button

## Integration Points

### Style Library Integration

**StyleCard Component:**
- Added "🎨 Manage Training Data" button
- Opens TrainingDataManager in new tab
- Maintains V1/V2 viewer buttons for backward compatibility

**App Component:**
- Manages TrainingDataManager tab lifecycle
- Handles tab switching and cleanup
- Passes style metadata to component

### Image Generation Integration

**"Send to Image Gen" Flow:**
- Loads base image as source
- Optionally loads training image for comparison
- Allows manual refinement of generated images
- Uses same settings as batch processing

## Technical Details

### Atomic Queue System

Similar to Prompt generation:
- **Concurrency**: Processes images sequentially to prevent API overload
- **Progress Tracking**: Real-time updates via state management
- **Abort Capability**: Clean cancellation without corrupting state
- **Error Handling**: Per-image success/failure tracking
- **Retry Support**: Failed images remain selectable

### Image Naming Convention

**Base Images:**
- Format: `{name}.{ext}` (e.g., `input_001.jpg`)
- Prompt: `{name}.txt` (e.g., `input_001.txt`)

**Training Images:**
- Format: `{base_name}_training.jpg`
- Example: `input_001.jpg` → `input_001_training.jpg`
- Automatically linked by filename matching

### Workflow Customization

The img2img workflow can be customized:

**Node 216** - Source Image (base64_data)
**Node 205** - LoRA Loader (lora_name, strength_model, strength_clip)
**Node 132** - Positive Prompt (t5xxl, guidance)
**Node 150** - KSampler (seed, steps, cfg, denoise, sampler, scheduler)
**Node 215** - Image Dimensions (width, height)

## Performance Considerations

### Batch Processing

- **Default**: Sequential processing (one at a time)
- **Reason**: Prevents RunPod API rate limiting
- **Progress**: Updates after each image completes
- **Time**: ~30-60 seconds per image (varies by settings)

### Image Storage

- **Base Images**: Stored once in `/resources/input_images/`
- **Training Images**: Stored per-style in `/resources/style_images/`
- **Format**: JPEG for training images (optimized file size)
- **Quality**: Preserves generated image quality

### Memory Usage

- **Base64 Encoding**: Temporary, released after processing
- **State Management**: Only tracks metadata, not image data
- **DOM Rendering**: Lazy loading for large image sets

## Error Handling

### Common Errors

**"No Prompt available"**
- Warning logged, uses default prompt: "a movie scene"
- Generate Prompts first for better results

**"Workflow not loaded"**
- Check `/workflows/img2img_workflow.json` exists
- Verify workflow JSON is valid

**"Failed to save training image"**
- Check write permissions on `/resources/style_images/`
- Verify style folder exists or can be created

**"RunPod API error"**
- Check RUNPOD_API_KEY environment variable
- Verify RUNPOD_SERVER_150_ID is configured
- Check RunPod account credits

### Recovery

**Partial Batch Failure:**
- Successful images are saved automatically
- Failed images remain selectable
- Retry failed images individually or in new batch

**Corrupt Training Image:**
- Delete the training image
- Base image remains intact
- Regenerate from scratch

## Future Enhancements

### Potential Improvements

1. **Parallel Processing** - Process multiple images concurrently with queue management
2. **Style Comparison** - Side-by-side comparison of multiple style versions
3. **Bulk Export** - Export training datasets as ZIP files
4. **Quality Metrics** - Automatic quality scoring of generated images
5. **A/B Testing** - Compare results with different settings
6. **History Tracking** - Keep previous versions of training images
7. **Smart Selection** - Auto-select images needing regeneration based on age/settings changes

## Best Practices

### Prompt Quality

- Use Prompt Editor to generate high-quality Prompts first
- Prompts significantly improve training image quality
- Follow Prompt format: "a movie scene of [detailed description]"

### Settings Optimization

- Start with default settings for the style
- Test on 2-3 images before batch processing
- Save working settings for consistency
- Higher denoise = more style influence

### Batch Size

- For testing: Process 3-5 images first
- For production: Batch up to 20-30 images
- Monitor progress and quality
- Abort and adjust if results are poor

### Storage Management

- Keep base images organized with clear names
- Archive old training images when regenerating
- Use style folders to keep data organized
- Regular backups of training datasets

## Troubleshooting

### Training images not appearing

1. Check browser console for errors
2. Verify images saved to correct folder
3. Refresh the Training Data Manager tab
4. Check file naming convention matches

### Batch processing stuck

1. Check Python script logs in terminal
2. Verify RunPod API connectivity
3. Check for API rate limiting
4. Use Abort button and retry

### Generated images look wrong

1. Verify style LoRA is correctly configured
2. Check Prompt quality (use Prompt Editor)
3. Review and adjust img2img settings
4. Test with different denoise values (0.6-0.9)

## API Reference

### Request Format

```typescript
POST /api/training-data/generate
{
  images: [
    {
      filename: "input_001.jpg",
      path: "/resources/input_images/input_001.jpg",
      fs_path: "../resources/input_images/input_001.jpg",
      Prompt: "a movie scene of a person standing in a forest"
    }
  ],
  workflow: { /* ComfyUI workflow JSON */ },
  settings: {
    seed: 877452,
    steps: 20,
    cfg: 1,
    denoise: 0.8,
    guidance: 3.5,
    width: 1360,
    height: 768,
    samplerName: "euler",
    schedulerName: "ddim_uniform"
  },
  styleId: "1",
  styleLoraName: "SBai_style_1.safetensors",
  loraStrengthModel: 1.1,
  loraStrengthClip: 1.1,
  promptFrontpad: "bold black and white line art...",
  promptBackpad: "frank miller style..."
}
```

### Response Format

```typescript
{
  success: true,
  results: [
    {
      filename: "input_001.jpg",
      success: true,
      result: {
        status: "COMPLETED",
        output: { /* RunPod response */ }
      }
    }
  ],
  total: 1,
  successful: 1,
  failed: 0
}
```

## Conclusion

The Training Data Management System provides a complete, production-ready solution for managing training data in your actor_maker toolkit. It follows the same atomic queuing pattern as your Prompt generation system, ensuring reliability and user-friendly operation.

Key benefits:
- ✅ Batch processing with progress tracking
- ✅ Individual image management
- ✅ Seamless integration with existing tools
- ✅ Automatic settings persistence
- ✅ Robust error handling
- ✅ Clean, intuitive UI

Happy training! 🎨
