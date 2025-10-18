# Color Term Stripping for B&W Training Images

## Overview

Black and white training images should not contain color-related terms in their prompts. The `prompt_color_stripper.py` module automatically removes all color terms from B&W prompts while preserving B&W-specific terminology.

## Implementation

### Location
- **Module**: `/home/markus/actor_maker/src/prompt_color_stripper.py`
- **Integration**: `/home/markus/actor_maker/src/actor_training_prompts.py`

### How It Works

1. **Color Detection**: Comprehensive list of 100+ color terms including:
   - Basic colors: red, blue, green, yellow, orange, purple, pink, brown
   - Variations: golden, silver, crimson, azure, emerald, ruby, etc.
   - Descriptors: bright, dark, light, pale, deep, vivid, rich, vibrant
   - Intensities: neon, pastel, fluorescent, iridescent, metallic

2. **B&W Term Preservation**: Protects legitimate B&W terminology:
   - "black-and-white", "black and white"
   - "rich blacks", "deep blacks", "pure blacks"
   - "white cuts", "white negative space", "white background"
   - "grey tones", "gray tones", "greyscale", "grayscale"

3. **Smart Cleaning**:
   - Uses word boundaries to avoid false matches (e.g., won't strip "red" from "centered")
   - Removes color phrases like "warm orange light", "vibrant color palette"
   - Cleans up extra spaces and punctuation after removal

### Integration

The color stripper is automatically applied in `get_actor_training_prompts()`:

```python
# Strip color terms from B&W prompts
bw_stylized_prompts_cleaned = [
    strip_color_terms(prompt) for prompt in bw_stylized_prompts
]
```

This ensures all B&W prompts (indices 15-25 in the prompt list) are automatically cleaned before being returned.

## Examples

### Before Stripping
```
"A charcoal drawing with rich blacks and bright orange highlights in warm golden light"
```

### After Stripping
```
"A charcoal drawing with rich blacks and highlights in light"
```

### B&W Terms Preserved
```
"A black-and-white pen and ink drawing with rich blacks and white negative space"
```
(No changes - B&W terms are preserved)

## Testing

Run the test suite:
```bash
./venv/bin/python src/prompt_color_stripper.py
```

Verify B&W prompts are clean:
```bash
./venv/bin/python -c "
from src.actor_training_prompts import get_actor_training_prompts
prompts = get_actor_training_prompts('woman')
# B&W prompts are indices 15-25
for i in range(15, 26):
    print(f'Prompt {i-14}: {prompts[i][:100]}...')
"
```

## Color Terms Removed

The stripper removes 100+ color terms including:

**Basic Colors**: red, blue, green, yellow, orange, purple, pink, brown, black, white, gray, grey, violet, indigo, cyan, magenta, turquoise, teal, navy, maroon, crimson, scarlet, burgundy

**Metallic**: golden, silver, bronze, copper, brass, gold, rose

**Gemstones**: amber, jade, emerald, ruby, sapphire, pearl, ivory

**Neutrals**: cream, beige, tan, khaki, olive, lime, mint

**Descriptors**: bright, dark, light, pale, deep, vivid, rich, muted, saturated, vibrant, dull, faded, warm, cool, hot, cold

**Specific Shades**: azure, cobalt, cerulean, ultramarine, vermillion, carmine, lavender, lilac, mauve, plum, coral, salmon, peach, tangerine, charcoal, slate, ash, smoke, steel, snow, alabaster

**Intensities**: neon, pastel, fluorescent, iridescent, metallic, glossy, matte, shiny, lustrous, gleaming

## Benefits

1. **Consistency**: All B&W images generated without color contamination
2. **Quality**: Improves B&W image generation by removing conflicting color instructions
3. **Automatic**: No manual prompt editing required
4. **Comprehensive**: Catches all color terms including obscure shades and variations
5. **Safe**: Preserves legitimate B&W terminology like "rich blacks"

## Future Enhancements

If needed, the color term list can be expanded by adding to the `COLOR_TERMS` set in `prompt_color_stripper.py`.
