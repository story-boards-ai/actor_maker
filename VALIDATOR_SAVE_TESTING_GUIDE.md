# Validator Settings Save - Testing Guide

## What Was Implemented

When you click "Save Settings" in the Validator's settings modal, the following now happens:

1. **Local Storage Save** (existing behavior)
   - Settings saved to browser localStorage per-style
   
2. **Registry Save** (new behavior)
   - Settings saved to `data/styles_registry.json`
   - Updates the style object with current settings

## Settings That Get Saved to Registry

### LoRA Weights (always present in registry)
- `lora_weight` - Main style LoRA weight
- `character_lora_weight` - Character LoRA weight  
- `cine_lora_weight` - Cinematography LoRA weight

### Generation Parameters (optional fields, added on first save)
- `steps` - Number of generation steps
- `cfg` - CFG Scale value
- `denoise` - Denoise strength
- `guidance` - Guidance scale
- `sampler_name` - Sampler algorithm name
- `scheduler_name` - Scheduler type

## How to Test

### 1. Start the development server
```bash
cd ui
npm run dev
```

### 2. Open Validator tab
- Navigate to the Validator tab in the UI
- Select a style from the dropdown

### 3. Open Settings Modal
- Click the "⚙️ Open Settings" button in the control panel
- The settings modal will open

### 4. Modify Settings
Change any of the following:
- LoRA weights (Model Strength / CLIP Strength)
- Steps slider
- CFG Scale slider
- Guidance slider
- Denoise slider
- Sampler dropdown
- Scheduler dropdown

### 5. Save Settings
- Click the "💾 Save Settings" button
- Watch the logs panel for confirmation messages:
  - "💾 Saving settings to registry for: [Style Name]..."
  - "✅ Settings saved to registry for: [Style Name]"

### 6. Verify in Registry File
Open `data/styles_registry.json` and find your style by ID:
```json
{
  "id": "1",
  "title": "Ink Intensity",
  "lora_weight": 1.15,              // ← Should be updated
  "character_lora_weight": 0.95,   // ← Should be updated
  "cine_lora_weight": 0.85,        // ← Should be updated
  "steps": 25,                      // ← Should be added/updated
  "cfg": 1.5,                       // ← Should be added/updated
  "denoise": 0.9875,                // ← Should be added/updated
  "guidance": 4.0,                  // ← Should be added/updated
  "sampler_name": "euler",          // ← Should be added/updated
  "scheduler_name": "karras",       // ← Should be added/updated
  "metadata": {
    "updated_at": "2025-10-14T..."  // ← Should be current timestamp
  }
}
```

### 7. Test Persistence
- Close the modal
- Refresh the page
- Select the same style
- Open settings modal
- Verify the settings match what you saved

## Expected Behavior

### Success Case
- ✅ Both log messages appear
- ✅ Registry file is updated
- ✅ Settings persist across page reloads
- ✅ Other users/instances will see the new defaults

### Error Cases
- ❌ If no style is selected: "ERROR: No style selected" in logs
- ❌ If registry file is missing: Error message in logs
- ❌ If write fails: "❌ ERROR: Failed to save settings to registry" in logs

## Troubleshooting

### Settings not saving to registry
1. Check browser console for errors
2. Check terminal/server logs for backend errors
3. Verify `data/styles_registry.json` file exists
4. Verify file permissions allow writing

### Settings save but don't persist
1. Check if another process is overwriting the file
2. Verify the registry reload is working (check console logs)
3. Check if styles are being synced from backend

## Files Modified

1. `/ui/config/routes/styles-api.ts` - Added `/api/styles/update-settings` endpoint
2. `/ui/src/components/ImageGenerator/hooks/useSettings.ts` - Added `saveSettingsToRegistry()` function
3. `/ui/src/components/Validator/Validator.tsx` - Added `saveValidatorSettingsToRegistry()` and updated modal props

## TypeScript Types

The Style interface in `/ui/src/types.ts` already supports these fields:
- Required: `lora_weight`, `character_lora_weight`, `cine_lora_weight`
- Optional: `steps?`, `cfg?`, `denoise?`, `guidance?`, `sampler_name?`, `scheduler_name?`

## Notes

- The "Save Prompts to Registry" button continues to work as before (saves only frontpad/backpad)
- The "Save Settings" button now saves BOTH to local storage AND to registry
- Settings are saved atomically - if the save fails, the file is not modified
- The `metadata.updated_at` timestamp is automatically updated on each save
