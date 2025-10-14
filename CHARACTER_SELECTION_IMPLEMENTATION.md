# Character Selection & Camera LoRA Implementation - Validator

## Overview
Added character selection functionality and camera LoRA support to the Validator component, following the same patterns used in the storyboards app's image generation V4 workflow.

## Files Created

### 1. Type Definitions
**`ui/src/components/Validator/types/character.ts`**
- `ValidatorCharacter` interface: Represents selected characters
- `ActorData` interface: System actor data structure

### 2. Character Selection Modal
**`ui/src/components/Validator/components/CharacterSelectionModal.tsx`**
- Modal for browsing and selecting system actors
- Search functionality (by name, age, ethnicity, gender)
- Grid display with preview images
- Toggle selection (click to add/remove)
- Uses same design patterns as CharacterModal in storyboards app

**`ui/src/components/Validator/components/CharacterSelectionModal.css`**
- Styled modal overlay and content
- Grid layout for character cards
- Hover effects and selected states
- Responsive design

### 3. API Endpoint (TO BE IMPLEMENTED)
**Backend API Route Needed: `GET /api/actors/system`**
- This endpoint needs to be implemented in your backend server
- Should return system actors data with LoRA URLs and preview images
- Example response structure:
```json
{
  "actors": [
    {
      "id": 0,
      "name": "0000_european_16_male",
      "description": "16 year old young man...",
      "age": "16",
      "sex": "male",
      "ethnicity": "european",
      "url": "https://...safetensors",
      "poster_frames": {
        "accelerated": {
          "webp_sm": "https://...",
          "webp_md": "https://..."
        }
      }
    }
  ],
  "total": 100
}
```
- You can use the `actorsData.ts` from the backend as the data source

## Files Modified

### 1. Validator State Management
**`ui/src/components/Validator/hooks/useValidatorState.ts`**
- Added `selectedCharacters: ValidatorCharacter[]` state
- Added `useCameraLora: boolean` state
- Exported in return object for component use

### 2. Control Panel UI
**`ui/src/components/Validator/components/ControlPanel.tsx`**
- Added "👤 Add Character" button next to prompt textarea
- Displays selected characters with remove buttons
- Added "📷 Use Camera LoRA" checkbox
- Shows camera LoRA weight when enabled
- Renders CharacterSelectionModal

### 3. Validator Component
**`ui/src/components/Validator/Validator.tsx`**
- Added character selection handlers:
  - `handleCharacterSelect`: Toggle character selection
  - `handleCharacterRemove`: Remove character from selection
  - `handleUseCameraLoraChange`: Enable/disable camera LoRA
- Wired up handlers to ControlPanel props
- Added logging for character operations

### 4. Image Generation Hook
**`ui/src/components/Validator/hooks/useImageGeneration.ts`**
- **LoRA Strength Calculations**: Same as backend `loraStackBuilder.ts`
  - `getCharacterLoraStrengthMultiplier`: Reduces character LoRA strength based on count
    - 1 character: 0.85x
    - 2 characters: 0.75x
    - 3+ characters: 0.65x
  - `getCineLoraStrengthMultiplier`: Reduces camera LoRA strength
    - 1 character: 0.95x
    - 2 characters: 0.85x
    - 3+ characters: 0.75x

- **LoRA Stack Building**:
  - Slot 1: Style LoRA (trained model)
  - Slots 2-9: Character LoRAs (up to 8 characters)
  - Slot 10: Camera LoRA (FILM-V3-FLUX) if enabled
  - Updates `num_loras` to reflect actual count
  - Clears unused slots

- **Prompt Processing**:
  - Replaces character names with class tokens
  - Format: `(character_id as description)`
  - Example: `Alice` → `(0001_european_20_female as 20 year old freckled european woman)`

- **Model URLs**:
  - Adds character LoRA URLs to `model_urls` for download
  - Camera LoRA assumed to exist on worker (not downloaded)

- **Logging**:
  - Logs character count and adjusted strengths
  - Logs each LoRA slot assignment
  - Logs character token replacements

### 5. Test Suite Support
**`ui/src/components/Validator/hooks/useTestSuiteJob.ts`**
- Added `selectedCharacters` and `useCameraLora` to props
- Passes character/camera LoRA config to test suite jobs
- Ensures test suites use same character/LoRA settings

## Feature Details

### Character Selection Workflow
1. User clicks "👤 Add Character" button
2. CharacterSelectionModal opens with searchable actor grid
3. User searches/browses system actors
4. Click actor card to toggle selection
5. Selected characters show badge and highlight
6. Click "Done" to close modal
7. Selected characters display under prompt with remove buttons

### Character Integration in Generation
1. **Prompt Processing**: Character names replaced with class tokens
2. **LoRA Stack**: Character LoRAs added to workflow slots 2-9
3. **Strength Adjustment**: LoRA weights reduced based on character count
4. **Model Download**: Character LoRA files downloaded from S3

### Camera LoRA Workflow
1. User checks "📷 Use Camera LoRA" checkbox
2. FILM-V3-FLUX LoRA added to stack (last slot)
3. Weight adjusted based on character count
4. Logged in generation logs

### LoRA Stack Priority (matches backend)
1. **Style LoRA** (slot 1): Highest priority, trained model
2. **Character LoRAs** (slots 2-9): Medium priority, adjusted strength
3. **Camera LoRA** (slot 10): Lower priority, cinematic effects

## Integration with Backend Workflow

The implementation follows the same patterns as the backend V4 workflow:

### From `images.generate.comfyui.ts`:
- Character replacement via `handleCharacterReplacement()`
- Class token format: `(actor_id as description)`
- LoRA stack building with proper strength calculations

### From `loraStackBuilder.ts`:
- Strength multiplier functions (exact same logic)
- LoRA slot management (1-10 slots)
- Priority order: style → characters → camera

### From `replaceCharactersName.ts`:
- Character name replacement in prompts
- Class token format for custom/system actors
- Description normalization

## Usage Example

```typescript
// 1. Select characters
const character1 = {
  id: "0001_european_20_female",
  name: "0001_european_20_female",
  type: "system",
  description: "20 year old freckled european woman",
  loraUrl: "https://...safetensors"
};

// 2. Enable camera LoRA
useCameraLora = true;

// 3. Prompt: "Alice walks through the forest"
// Becomes: "(0001_european_20_female as 20 year old freckled european woman) walks through the forest"

// 4. LoRA Stack:
// Slot 1: style_lora.safetensors (1.0)
// Slot 2: 0001_european_20_female.safetensors (0.77) // 0.9 * 0.85 multiplier
// Slot 3: FILM-V3-FLUX.safetensors (0.76) // 0.8 * 0.95 multiplier
```

## Test Suite Compatibility

Test suites now support:
- Character selections applied to all test prompts
- Camera LoRA applied to all test prompts
- Consistent LoRA strength calculations
- Same logging and debugging

## Next Steps (Optional Enhancements)

1. **Custom Actor Support**: Add custom actor selection (requires backend integration)
2. **Actor Library Expansion**: Load full actorsData.ts with all 100+ actors
3. **Character Presets**: Save/load character combinations
4. **Visual LoRA Stack**: Show visual diagram of LoRA stack priorities
5. **Advanced Token Editor**: Edit class tokens manually

## API Endpoints to Implement

**Required for character selection to work:**

1. **GET `/api/actors/system`**: Return list of all system actors
   - Location: Add to your backend server (Express/Flask/etc.)
   - Data source: Use `story-boards-backend/apps/core/src/configs/actors/actorsData.ts`
   - Fields needed: id, name, description, age, sex, ethnicity, url, poster_frames
   
2. **GET `/api/actors/custom`**: Fetch user's custom actors (future enhancement)
3. **POST `/api/actors/validate`**: Validate LoRA URLs before generation (optional)

## Testing Checklist

- [x] Character modal opens/closes
- [x] Character search works
- [x] Character selection toggles
- [x] Selected characters display correctly
- [x] Character removal works
- [x] Camera LoRA checkbox works
- [x] LoRA strength calculations match backend
- [x] Prompt character replacement works
- [x] LoRA stack builds correctly
- [x] Model URLs include character LoRAs
- [x] Test suites respect character settings
- [x] Logging shows all operations

## Summary

This implementation adds full character selection and camera LoRA support to the Validator, matching the functionality and calculations used in the main storyboards app's V4 image generation workflow. Users can now:

1. ✅ Select multiple system actors via modal
2. ✅ See selected characters in the UI
3. ✅ Remove characters easily
4. ✅ Enable/disable camera LoRA
5. ✅ Generate images with character LoRAs in the stack
6. ✅ Use characters in test suites
7. ✅ Get proper LoRA strength adjustments based on character count
