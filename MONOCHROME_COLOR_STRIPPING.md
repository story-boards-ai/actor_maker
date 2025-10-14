# Monochrome Color Stripping Feature

## Overview

When using monochrome styles (black and white, grayscale, ink-based), the system automatically removes color references from prompts to prevent the AI from generating colored imagery.

## How It Works

### 1. Detection
The system checks if a style has `monochrome: true` in the style registry:
```json
{
  "id": "1",
  "title": "Ink Intensity",
  "monochrome": true,
  ...
}
```

### 2. Color Stripping
When a monochrome style is selected, the system:
- ✅ Strips color words from **frontpad**
- ✅ Strips color words from **Prompt** (user prompt)
- ✅ Strips color words from **backpad**
- ✅ Preserves **trigger words** (never stripped)

### 3. Cleaned Keywords

The system removes 70+ color-related terms including:

**Basic Colors:**
- red, blue, green, yellow, orange, purple, pink, brown
- violet, indigo, cyan, magenta, turquoise, teal, lime
- maroon, navy, olive, aqua, coral, salmon, crimson
- amber, emerald, ruby, sapphire, rose, lavender, mint
- and more...

**Color Descriptors:**
- light, dark, bright, pale, deep, vivid, vibrant
- pastel, neon, fluorescent, metallic, glossy
- colored, colorful, multicolored, rainbow, chromatic

**Color Phrases:**
- warm tones, cool tones, earth tones, jewel tones
- color palette, color scheme, color grading

## Examples

### Example 1: Prompt Cleaning
**Original Prompt:**
```
a person in a bright red jacket walking through a colorful autumn forest with golden leaves
```

**Monochrome Cleaned:**
```
a person in a jacket walking through an autumn forest with leaves
```

### Example 2: Frontpad Cleaning
**Original Frontpad:**
```
painted storyboard with vibrant colors, warm tones, cinematic illustration
```

**Monochrome Cleaned:**
```
painted storyboard with, cinematic illustration
```

### Example 3: Full Prompt
**Original:**
```
style SBai_style_1, vivid colors, bold composition, a blue car in a green field with golden sunset, cinematic lighting, vibrant color grading
```

**Monochrome:**
```
style SBai_style_1, composition, a car in a field with sunset, cinematic lighting
```

## UI Indicators

When a monochrome style is selected:

1. **Prompt Preview Header** shows ⚫ symbol
2. **Subtitle** changes to: "Monochrome (colors stripped)"
3. **Generation Log** shows:
   ```
   Style data loaded: Ink Intensity
     - Monochrome: YES
   ⚫ Monochrome mode: Stripped color references
     - Frontpad cleaned: 123 → 98 chars
     - Prompt cleaned: "blue sky..." → "sky..."
   ```

## Technical Implementation

### Files
- `/ui/src/utils/promptUtils.ts` - Color stripping utilities
- `/ui/src/components/ImageGenerator.tsx` - Integration

### Functions
```typescript
stripColorReferences(text: string): string
isMonochromeStyle(style: { monochrome?: boolean }): boolean
```

### When Applied
- **Preview**: Real-time when style/prompt changes
- **Generation**: Before sending to RunPod API

## Benefits

✅ **Consistency**: Ensures monochrome styles produce B&W imagery  
✅ **Automatic**: No manual prompt editing required  
✅ **Transparent**: Shows before/after in logs  
✅ **Comprehensive**: Covers 70+ color terms  
✅ **Smart**: Preserves non-color content and structure  

## Monochrome Styles

Current monochrome styles in the registry:
- **Ink Intensity** (style_1)
- **Dynamic Simplicity** (style_16)
- **Charcoal Definition** (style_30)
- **Pen and Ink** (style_46)
- **Shadowy Volumes** (style_54)
- **Raw Linework** (style_88)
- **Sharp Noir** (style_100)

## Edge Cases

### Preserved Terms
- "light" and "dark" as lighting terms (context-dependent)
- Color words in proper nouns or technical terms

### Cleanup
- Removes duplicate commas and spaces
- Trims leading/trailing punctuation
- Normalizes spacing

## Future Enhancements

- [ ] Context-aware preservation (e.g., "light source" vs "light blue")
- [ ] Language-specific color dictionaries
- [ ] User-configurable color keyword list
- [ ] Preview diff showing exactly what was removed
