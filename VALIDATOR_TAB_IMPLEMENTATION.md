# Validator Tab Implementation

## Overview
The **Validator** tab is a new interface in the Styles Maker application designed for text-to-image generation with comprehensive parameter control. It allows users to validate and fine-tune style models by generating images from text prompts with extensive customization options.

## Features

### 🎨 Style Model Selection
- **Style Dropdown**: Select from all available style models in the registry
- **Style Information Display**: Shows model name, monochrome status, and current LoRA weights
- **Auto-load Settings**: Automatically loads saved settings and style-specific parameters when a style is selected

### ✏️ Prompt System
- **Main Prompt**: Core text description for image generation
- **Front Pad**: Prefix text added before the main prompt (style-specific)
- **Back Pad**: Suffix text added after the main prompt (style-specific)
- **Trigger Words**: Automatically included from style definition
- **Full Prompt Preview**: Expandable preview showing the complete assembled prompt
- **Monochrome Processing**: Automatic color reference stripping for monochrome styles

### ⚙️ Expert Settings Modal
Comprehensive settings panel with all generation parameters:

#### Generation Parameters
- **Seed**: Random seed control with lock/unlock toggle
- **Steps**: Number of sampling steps (1-50)
- **CFG Scale**: Classifier-Free Guidance strength (1-20)
- **Guidance**: FLUX guidance parameter (1-20)
- **Denoise**: Fine-grained denoise control (0-1) with inverse exponential slider
- **Dimensions**: Width and height (512-2048px, 64px increments)
- **Sampler**: 11 different sampling algorithms
- **Scheduler**: 6 scheduler options

#### LoRA Weights (Style-Specific)
- **Style LoRA Weight**: Main style LoRA strength (0-2)
- **Character LoRA Weight**: Character actor LoRA strength (0-2)
- **Cine LoRA Weight**: Cinematic LoRA strength (0-2)
- **Reset to Default**: Button to restore style's default LoRA weights

#### Monochrome Processing (if applicable)
- **Contrast**: Contrast adjustment (0.5-2x)
- **Brightness**: Brightness adjustment (0.5-1.5x)

#### Style Prompts
- **Front Pad**: Editable in settings modal
- **Back Pad**: Editable in settings modal
- **💾 Save to Registry**: Saves frontpad/backpad changes directly to the style registry

### 🖼️ Image Display
- **Generated Image**: Full-size display with monochrome filter applied (if applicable)
- **Download**: Save generated image
- **View Full Size**: Open in new tab
- **Loading State**: Animated spinner during generation
- **Error Handling**: Clear error messages

### 📜 Generation Logs
- **Real-time Logging**: Detailed generation process logs
- **Timestamped Entries**: Each log entry includes timestamp
- **Scrollable Container**: Auto-scrolling log viewer
- **Clear Logs**: Button to clear log history

## File Structure

```
ui/src/components/Validator/
├── Validator.tsx                    # Main component
├── Validator.css                    # Styles
├── hooks/
│   ├── useValidatorState.ts        # State management
│   └── useImageGeneration.ts       # Text-to-image generation logic
└── components/
    ├── ControlPanel.tsx            # Left panel controls
    └── GeneratedImageDisplay.tsx   # Right panel image display

# Reuses existing components from ImageGenerator:
├── ../ImageGenerator/hooks/useSettings.ts        # Settings persistence
└── ../ImageGenerator/components/SettingsModal.tsx # Settings modal
```

## Technical Details

### State Management
The `useValidatorState` hook manages all application state:
- Style selection and data
- All generation parameters
- UI state (loading, errors, modals)
- Logs and prompt preview

### Settings Persistence
The `useSettings` hook handles:
- **Loading**: Fetches saved settings from `/api/settings/load?styleId={id}`
- **Saving**: Posts settings to `/api/settings/save?styleId={id}`
- **Style Prompts**: Updates registry via `/api/styles/update-prompts`
- **Auto-apply Defaults**: Applies style-specific defaults if no saved settings exist

### Image Generation Flow
1. **Validation**: Checks for selected style and prompt
2. **Seed Handling**: Randomizes if unlocked, uses fixed seed if locked
3. **Workflow Loading**: Fetches `/workflows/normal_image_v4_workflow.json`
4. **Parameter Injection**: Injects all settings into workflow nodes
5. **Prompt Assembly**: Combines trigger words + frontpad + prompt + backpad
6. **Monochrome Processing**: Strips color references if style is monochrome
7. **API Request**: Posts to `/api/generate-image` with workflow payload
8. **Response Handling**: Extracts image URL and displays result

### Workflow Integration
Uses the `normal_image_v4_workflow.json` for text-to-image generation:
- **Node 1**: Model loader (FLUX Dev)
- **Node 150**: KSampler with generation parameters
- **Node 51/132**: FLUX guidance control
- **Node 205**: Style LoRA loader
- **Node 215**: Empty latent image (dimensions)
- **Node 132**: Dual CLIP text encode (T5XXL + CLIP-L)

### API Endpoints Used
- `GET /api/styles/list` - Load available styles
- `GET /api/settings/load?styleId={id}` - Load saved settings
- `POST /api/settings/save?styleId={id}` - Save settings
- `POST /api/styles/update-prompts` - Update frontpad/backpad in registry
- `POST /api/generate-image` - Generate image

## Key Differences from Image Generator Tab

| Feature | Image Generator | Validator |
|---------|----------------|-----------|
| **Purpose** | img2img with training data | Text-to-image validation |
| **Input** | Source image required | Text prompt only |
| **Workflow** | `img2img_workflow.json` | `normal_image_v4_workflow.json` |
| **Use Case** | Training data generation | Style validation & testing |
| **Primary User** | Training workflow | Style validation |

## Settings Modal Features

### Draggable Interface
- Click and drag the modal header to reposition
- Modal remembers position until closed

### Save Status Feedback
Visual feedback for save operations:
- **Idle**: "💾 Save Settings"
- **Saving**: "⏳ Saving..." (disabled)
- **Saved**: "✅ Saved!" (green, 2s timeout)
- **Error**: "❌ Error" (red, 3s timeout)

### Smart Defaults
- Loads saved settings if available
- Falls back to style-specific defaults
- Falls back to global defaults if no style selected

## Saving to Registry

When you save settings, two operations occur:

1. **Settings Persistence**: Saves all parameters to settings file
2. **Registry Update**: Updates `frontpad` and `backpad` in `styles_registry.json`

This allows you to:
- Test different frontpad/backpad values per generation
- Save successful combinations back to the style definition
- Have those changes persist across all applications using the style

## Usage Workflow

1. **Select Style**: Choose a style model from the dropdown
2. **Enter Prompt**: Write your main prompt description
3. **Adjust Prompts** (optional): Modify frontpad/backpad for this generation
4. **Open Settings** (optional): Fine-tune generation parameters
5. **Generate**: Click "🚀 Generate Image"
6. **Review**: Check generated image and logs
7. **Save Settings** (optional): Save parameters and prompts to registry
8. **Iterate**: Adjust and regenerate as needed

## CSS Variables Used

The Validator uses the existing design system:
- `--background`: Main background color
- `--surface`: Surface/card background
- `--border`: Border color
- `--text-primary`: Primary text color
- `--text-secondary`: Secondary text color
- `--accent`: Accent color (buttons, highlights)
- `--accent-hover`: Accent hover state
- `--error`: Error color

## Responsive Design

- **Desktop** (>1200px): Two-column layout (controls + image)
- **Mobile** (<1200px): Single-column stacked layout
- Settings modal adapts to screen size (90% width, max 800px)

## Performance Considerations

- **Lazy Loading**: Only loads workflow when generating
- **Debounced Logs**: Prevents excessive log updates
- **Cache Busting**: Adds timestamp to image URLs to force reload
- **Optimized Re-renders**: Minimal re-renders through proper state management

## Future Enhancements

Potential improvements:
- **Batch Generation**: Generate multiple variations
- **Prompt History**: Save and recall previous prompts
- **Style Comparison**: Side-by-side style comparison
- **Advanced LoRA Stack**: Support for custom LoRA combinations
- **Export Presets**: Save/load parameter presets
- **Variation Generation**: Generate variations of successful images

## Troubleshooting

### Image Not Generating
- Check if style is selected
- Verify prompt is not empty
- Check browser console for API errors
- Review generation logs for detailed error messages

### Settings Not Saving
- Ensure style is selected
- Check `/api/styles/update-prompts` endpoint is working
- Verify write permissions on `styles_registry.json`

### Workflow Errors
- Verify `normal_image_v4_workflow.json` exists
- Check RunPod endpoint configuration
- Ensure LoRA files exist on RunPod workers

## Integration with Existing System

The Validator integrates seamlessly with:
- **Style Registry**: Reads and writes to `styles_registry.json`
- **Settings API**: Uses existing settings endpoints
- **Generation API**: Uses existing `/api/generate-image` endpoint
- **Design System**: Follows existing UI patterns and styling
- **Workflow System**: Compatible with existing workflow infrastructure

---

**Status**: ✅ Fully implemented and ready for use
**Version**: 1.0.0
**Last Updated**: 2025-10-11
