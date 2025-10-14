# Validator Settings Sets System

## Overview

The Validator Settings Sets system allows users to save, load, and manage complete configuration sets for style validation. Each settings set captures all generation parameters, assessment ratings, and notes for easy reuse and comparison.

## Features

### 1. Model Filtering by Style
- **Auto-filtering**: Only shows trained models for the currently selected style
- **Smart selection**: Automatically selects the first available model when style changes
- **Helpful messages**: Shows contextual messages when no models exist for a style

### 2. Assessment System
- **Ratings**: 5 levels (Excellent ⭐, Good ✅, Acceptable 👍, Poor ⚠️, Failed ❌)
- **Comments**: Free-form notes about configuration performance
- **Visual indicators**: Color-coded buttons with emoji icons for easy identification

### 3. Settings Sets Management
- **Save configurations**: Capture all current settings with one click
- **Load configurations**: Restore complete settings including ratings and comments
- **Per-style organization**: Settings sets are organized by style ID
- **Delete functionality**: Remove outdated or unsuccessful configurations

## What Gets Saved

Each settings set includes:

- **Identification**
  - Unique ID
  - User-defined name
  - Timestamp
  - Style ID and name
  - Model ID and name

- **Generation Parameters**
  - Seed and seed lock state
  - Steps, CFG, denoise, guidance
  - Width and height
  - Sampler and scheduler names

- **LoRA Weights**
  - Main LoRA weight
  - Character LoRA weight
  - Cine LoRA weight

- **Monochrome Settings**
  - Contrast
  - Brightness

- **Prompt Configuration**
  - Front pad (prefix)
  - Back pad (suffix)

- **Assessment**
  - Rating (excellent/good/acceptable/poor/failed)
  - Comments and notes

- **Optional**
  - Test image URL (if available)
  - Test prompt (if used)

## File Storage

Settings sets are stored in JSON files organized by style:

```
data/validator_settings_sets/
  ├── style_5_sweeping_elegance.json
  ├── style_82_stellar_sketch.json
  └── style_101_linear_perspective.json
```

Each file contains an array of settings sets for that style.

## API Endpoints

### List Settings Sets
```
GET /api/settings-sets?styleId={styleId}
```

Returns summaries of all settings sets for the specified style.

**Response:**
```json
{
  "settingsSets": [
    {
      "id": "uuid",
      "name": "High Quality Configuration",
      "styleId": "5_sweeping_elegance",
      "styleName": "Sweeping Elegance",
      "modelName": "model_20250112",
      "rating": "excellent",
      "timestamp": "2025-01-12T08:00:00.000Z"
    }
  ]
}
```

### Get Settings Set
```
GET /api/settings-sets/{id}
```

Returns complete settings set data including all parameters.

### Create Settings Set
```
POST /api/settings-sets
```

**Request Body:**
```json
{
  "name": "High Quality Configuration",
  "styleId": "5_sweeping_elegance",
  "styleName": "Sweeping Elegance",
  "modelId": "model_uuid",
  "modelName": "model_20250112",
  "rating": "excellent",
  "comment": "Works great for landscapes",
  "seed": 42,
  "seedLocked": true,
  "steps": 20,
  "cfg": 1,
  "denoise": 1,
  "guidance": 3.5,
  "width": 1360,
  "height": 768,
  "samplerName": "euler",
  "schedulerName": "ddim_uniform",
  "loraWeight": 1.0,
  "characterLoraWeight": 0.9,
  "cineLoraWeight": 0.8,
  "monochromeContrast": 1.2,
  "monochromeBrightness": 1.0,
  "frontpad": "cinematic, professional",
  "backpad": "high quality, detailed"
}
```

**Response:**
```json
{
  "id": "generated-uuid",
  "timestamp": "2025-01-12T08:00:00.000Z",
  ...all fields from request
}
```

### Delete Settings Set
```
DELETE /api/settings-sets/{id}
```

Removes the settings set from storage.

## Usage Workflow

### Saving a Configuration

1. Configure all settings in the Validator
2. Generate test images and evaluate results
3. Add rating and comments in the Assessment Panel
4. Click **💾 Save Current Settings**
5. Enter a descriptive name
6. Click **Save Settings Set**

### Loading a Configuration

1. Click **📂 Load Settings** in the Validator
2. Browse saved settings sets for the current style
3. Click on a settings set to load it
4. All parameters, including assessment, are restored

### Managing Configurations

- **Delete**: Hover over a settings set and click 🗑️ to delete
- **Filter**: Settings sets are automatically filtered by selected style
- **Sort**: Displayed in chronological order (newest first)

## UI Components

### AssessmentPanel
Located in the right panel next to generated images. Provides:
- Rating buttons with color-coded styling
- Comments textarea for detailed notes
- Visual feedback for current assessment

### SaveSettingsSetModal
Modal dialog for saving configurations:
- Name input field
- Preview of what will be saved
- Validation and error handling
- Save confirmation

### LoadSettingsSetModal
Modal dialog for loading configurations:
- List of saved settings sets
- Preview information (name, model, rating, date)
- Load on click functionality
- Delete button per item

### Control Panel Integration
Settings Sets section in the control panel:
- Only visible when style and model are selected
- Two action buttons: Save and Load
- Green theme to distinguish from other sections

## Technical Implementation

### State Management
- **useValidatorState**: Manages all validator settings and state
- **useSettingsSets**: Manages settings sets operations (load, save, delete)
- **Filtered models**: Computed via `useMemo` for efficiency

### Data Flow
1. User configures settings in Validator
2. Settings Sets hook captures current state
3. API call saves to JSON file
4. On load, API fetches full settings
5. `applySettings` function restores all state

### Error Handling
- Validation for required fields
- File system error handling
- Network error recovery
- User-friendly error messages

## Best Practices

### Naming Conventions
- Use descriptive names: "High Quality Landscapes" not "Config 1"
- Include context: "Fast Draft Settings" vs "Final Render Settings"
- Add version if iterating: "Portrait Setup v2"

### Organization
- Rate all configurations for easy filtering
- Add detailed comments explaining what works
- Delete unsuccessful configurations to reduce clutter
- Keep configurations current with your workflow

### Workflow Tips
- Save successful configurations immediately
- Test loaded configurations before modifications
- Use ratings to quickly identify best configurations
- Update comments as you learn more about settings

## Future Enhancements

Potential additions:
- Export/import settings sets
- Search and filter by rating
- Duplicate settings sets
- Batch operations
- Comparison view for multiple sets
- Templates and presets
- Version history
