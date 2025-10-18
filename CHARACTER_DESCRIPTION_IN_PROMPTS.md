# Character Description in Training Prompts

## Issue
Training image generation was using generic descriptors like "the man" or "the woman" instead of the full character description with outfit details.

## Example
**Before:**
```
"Cinematic film scene: Extreme close-up of the man's face in natural lighting..."
```

**After:**
```
"Cinematic film scene: Extreme close-up of A 30 year old european man, with short blonde balding hair and a goatee beard, wearing Casual tech startup attire with a red and black plaid button-up shirt, dark blue jeans, and brown leather desert boots's face in natural lighting..."
```

## Solution

Modified `/home/markus/actor_maker/ui/config/routes/actors/actor-management.handlers.ts` in the `handleGetPresetTrainingPrompts` function:

### Changes:
1. **Build Full Character Description**: Combines `actor.description` + `actor.outfit`
   - Format: `"{description}, wearing {outfit}"`
   - Falls back to generic descriptor if description is missing

2. **Replace Generic Descriptors**: Uses regex to find and replace patterns
   - Matches: "the man", "the woman", "the person", "The man", etc.
   - Pattern: `\b(the|The)\s+(man|woman|person)\b`
   - Replaces with full character description

3. **Applies to All Prompts**: All 35 prompts (15 photorealistic + 11 B&W + 9 color) get customized

### Data Sources:
- **Description**: From `actorsData.json` → `actor.description`
  - Example: "A 30 year old european man, with short blonde balding hair and a goatee beard"
  
- **Outfit**: From `actorsData.json` → `actor.outfit`
  - Example: "Casual tech startup attire with a red and black plaid button-up shirt, dark blue jeans, and brown leather desert boots"

### Result:
- Each training image prompt now includes specific character details
- Replicate API receives full character description for better image generation
- Character appearance and outfit are preserved across all training images
- More consistent LoRA training with detailed character descriptions

## Files Modified:
- `/home/markus/actor_maker/ui/config/routes/actors/actor-management.handlers.ts` (lines 294-344)

## Testing:
Check the debug file after generating an image:
```bash
cat debug/replicate_requests/replicate_request.json
```

The `prompt` field should now contain the full character description instead of generic "the man" or "the woman".
