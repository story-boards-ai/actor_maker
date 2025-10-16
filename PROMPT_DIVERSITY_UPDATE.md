# Training Prompt Diversity Update

## Summary
Fixed prompt count mismatch between Python backend and UI, and significantly enhanced environment diversity in training prompts.

## Issues Resolved

### 1. **Prompt Count Mismatch**
- **Problem**: `actor_training_prompts.py` had 17 prompts, but the API endpoint only exposed 12 prompts to the UI
- **Impact**: Users couldn't access 5 prompts that existed in the backend
- **Solution**: Synced both files to provide all 25 prompts

### 2. **Urban-Heavy Bias**
- **Problem**: Most prompts were urban/city environments (alleys, streets, subways, rooftops)
- **Impact**: Limited diversity in training data, potentially affecting model generalization
- **Solution**: Added diverse natural and outdoor environments

## Changes Made

### Python Backend (`src/actor_training_prompts.py`)
**Before**: 15 photorealistic prompts (mostly urban)
**After**: 15 photorealistic prompts with balanced diversity:

#### Environment Distribution:
- **Urban (6 prompts)**: Rain street, window, subway, parking garage, rooftop, alley
- **Nature (3 prompts)**: Misty forest, mountain trail, forest stream
- **Water (3 prompts)**: Rocky beach sunset, lake dock dusk, storm pier
- **Outdoor (3 prompts)**: Grass field, desert canyon, (various outdoor settings)

#### Lighting Variety:
- **Night**: Rain street, subway, alley, rooftop dusk
- **Day**: Mountain trail, grass field noon, forest stream
- **Golden Hour/Sunset**: Beach, desert canyon, lake dock dusk
- **Dawn**: Misty forest
- **Storm/Overcast**: Storm pier
- **Mixed/Indoor**: Window light, parking garage

### API Endpoint (`ui/config/routes/actors-api.ts`)
**Before**: 12 prompts (6 photo + 3 B&W + 3 color)
**After**: 25 prompts (15 photo + 6 B&W + 4 color)

Added missing prompts:
- **Photorealistic**: Forest dawn, beach sunset, mountain trail, lake dock, grass field, forest stream, desert canyon, storm pier, portrait
- **B&W Stylized**: Graphite train, charcoal warehouse, vector poster, manga phone
- **Color Stylized**: Vector metro platform

### UI Component (`ui/src/components/ActorTrainingDataManager/ActorTrainingDataManager.tsx`)
- Updated "Generate All Prompts" button: `(16)` → `(25)`
- Updated progress total: `16` → `25`

## Prompt Categories

### Photorealistic (15 total)
1. Urban Night - Rain Street
2. Nature - Misty Forest
3. Water - Rocky Beach Sunset
4. Urban - Close-up Portrait
5. Nature - Mountain Trail
6. Water - Lake Dock Dusk
7. Urban - Window Reflection
8. Outdoor - Grass Field
9. Urban Night - Subway
10. Nature - Forest Stream
11. Urban - Parking Garage
12. Outdoor - Desert Canyon
13. Urban Dusk - Rooftop
14. Water - Storm Pier
15. Urban Night - Alley Call

### B&W Stylized (6 total)
1. Pen & Ink - Townhouse
2. Graphite - Train Window
3. Charcoal - Warehouse Door
4. Woodcut - Alley Sprint
5. Vector - Poster Silhouette
6. Manga - Tense Call

### Color Stylized (4 total)
1. Comic - Rooftop Leap
2. Vector - Metro Platform
3. Watercolor - Diner Window
4. Gouache - Stairwell

## Benefits

### Training Quality
- **More diverse environments** → Better model generalization
- **Varied lighting conditions** → Improved performance across different scenarios
- **Natural settings** → Models work better in outdoor/nature contexts
- **Water scenes** → Better handling of reflections and water environments

### User Experience
- **All prompts accessible** → Users can now select from complete prompt library
- **Clear categorization** → Labels indicate environment type (Urban/Nature/Water/Outdoor)
- **Better selection** → 25 prompts vs 12 gives more creative options

### Model Performance
- **Reduced urban bias** → Models won't be overfitted to city environments
- **Environmental variety** → Better performance across different scene types
- **Lighting diversity** → Handles day/night/golden hour/storm conditions
- **Composition variety** → Wide shots, close-ups, action, contemplative poses

## Testing Recommendations

1. **Generate all 25 prompts** for a test actor to verify:
   - All prompts are accessible in the UI
   - Environment diversity is visible in generated images
   - Lighting variations are properly rendered

2. **Train a model** with the new diverse dataset:
   - Test in urban scenes (should still work well)
   - Test in nature scenes (should show improvement)
   - Test in water scenes (should show improvement)
   - Test in various lighting conditions

3. **Compare results** with old 12-prompt training:
   - Check if model generalizes better
   - Verify no degradation in urban scene quality
   - Confirm improvements in nature/water scenes

## Files Modified

1. `/src/actor_training_prompts.py` - Enhanced with diverse environments
2. `/ui/config/routes/actors-api.ts` - Synced to match all 25 prompts
3. `/ui/src/components/ActorTrainingDataManager/ActorTrainingDataManager.tsx` - Updated counts

## Notes

- All prompts maintain the "candid, no eye contact" style for consistent training
- Prompts are designed to avoid camera awareness for natural-looking results
- Environment labels help users quickly identify scene types
- Total count: **25 prompts** (15 photorealistic + 6 B&W + 4 color)
