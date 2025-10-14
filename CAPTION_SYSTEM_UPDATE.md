# Caption System Update - Flux LoRA Training Best Practices

## Overview

Updated the entire caption generation system to follow Flux LoRA training best practices based on your comprehensive caption guide. The system now creates meaningful captions that properly train style LoRAs without interfering with style learning.

## Key Changes

### 1. **New Caption Prompts Module** (`src/utils/caption_prompts.py`)

Created a dedicated module for caption generation prompts that:

- **Follows best practices**: Based on your `docs/CAPTION_GUIDE.md`
- **Avoids style descriptions**: Never mentions artistic medium, colors, brush strokes
- **Focuses on scene content**: Describes subjects, objects, lighting, setting, camera
- **Supports trigger tokens**: Configurable trigger token or `[TRIGGER]` placeholder
- **Provides examples**: Good vs bad caption comparisons in the prompt

**Key Functions**:
```python
get_caption_prompts(trigger_token=None)  # Get prompts with custom trigger
DEFAULT_SYSTEM_PROMPT                     # Default system prompt
DEFAULT_USER_PROMPT                       # Default user prompt
```

### 2. **Enhanced OpenAI Client** (`src/utils/openai_client.py`)

Updated to support all GPT models correctly:

**GPT-5 Compatibility**:
- Uses `max_completion_tokens` instead of `max_tokens` for GPT-5
- Omits custom temperature for GPT-5 (only supports default 1.0)
- Automatically detects GPT-5 models via `model.lower().startswith("gpt-5")`

**Both Methods Updated**:
- `text_completion()` - Text-only completions
- `vision_completion()` - Image + text completions

**All Models Supported**:
- GPT-4o, GPT-4o Mini
- GPT-4.1, GPT-4.1 Mini  
- GPT-5, GPT-5 Mini, GPT-5 Nano

### 3. **Updated Caption Generation Script** (`scripts/generate_captions.py`)

Enhanced to use new prompts and handle all models:

- **Imports new prompts**: Uses `caption_prompts.py` as defaults
- **Model-aware temperature**: Uses 1.0 for GPT-5, 0.7 for others
- **Fallback to defaults**: Uses best-practice prompts if none provided
- **Clear documentation**: Comments explain the prompt system

### 4. **Updated CaptionEditor UI** (`ui/src/components/CaptionEditor.tsx`)

Replaced old prompts with new Flux LoRA training prompts:

**New Default Prompts**:
- System prompt: Explains style LoRA training rules
- User prompt: Detailed instructions with good/bad examples
- Both prompts emphasize NOT describing style

**Updated Settings Panel**:
- New best practices tips focused on Flux LoRA training
- Clear DO/DON'T guidelines
- Reference to `docs/CAPTION_GUIDE.md`
- Explanation of trigger token usage

**Enhanced CSS** (`ui/src/components/CaptionEditor.css`):
- Added `.settings-note` styling for documentation references
- Styled `code` elements for file paths

### 5. **Documentation**

**Created**:
- `src/utils/README_CAPTION_PROMPTS.md` - Usage guide for caption prompts module
- `CAPTION_SYSTEM_UPDATE.md` - This summary document

**Referenced**:
- `docs/CAPTION_GUIDE.md` - Your comprehensive caption guide (already exists)

## What Changed in the Prompts

### Old Approach (Movie Scene Focused)
```
"a movie scene of [description]"
- Described everything including mood and style
- Focused on cinematic language
- No trigger token support
```

### New Approach (Flux LoRA Training)
```
"[scene content description], [TRIGGER]"
- NEVER describes style (colors, medium, aesthetics)
- ONLY describes variable scene content
- Always includes trigger token
- Focuses on elements you want prompt control over
```

## Example Caption Comparison

### ❌ Old Style (Bad for LoRA Training)
```
"a movie scene of a beautifully painted woman in vibrant autumn colors 
with soft brush strokes and dreamy atmosphere"
```

### ✅ New Style (Good for LoRA Training)
```
"a woman sitting on a park bench reading a book, autumn trees in 
background, soft afternoon light, [TRIGGER]"
```

**Why the new style is better**:
- No style descriptors ("beautifully painted", "vibrant colors", "soft brush strokes")
- Describes scene content (subject, action, setting, lighting)
- Trigger token allows style to be learned implicitly
- Gives prompt control over elements (sitting, reading, park, autumn, afternoon light)

## How It Works

### 1. Caption Generation Flow

```
User selects images → Clicks "Generate" → System uses prompts
                                              ↓
                                    OpenAIClient.vision_completion()
                                              ↓
                                    Model-specific parameters
                                    (GPT-5 vs GPT-4 handling)
                                              ↓
                                    Returns caption following rules
                                              ↓
                                    Caption saved to .txt file
```

### 2. Model Compatibility

```python
# GPT-4 and earlier
params = {
    "max_tokens": 300,
    "temperature": 0.7
}

# GPT-5
params = {
    "max_completion_tokens": 300,
    # temperature omitted (uses default 1.0)
}
```

### 3. Prompt Customization

Users can customize prompts in the UI settings panel:
- Edit system prompt (GPT's role and rules)
- Edit user prompt (specific instructions)
- Select GPT model
- Reset to defaults anytime

## Benefits

### For Training Quality
✅ **Better LoRA learning**: Style encoded implicitly, not in text
✅ **More flexibility**: Prompt control over scene elements
✅ **Less overfitting**: Varied captions prevent memorization
✅ **Proper trigger usage**: Consistent trigger token placement

### For Users
✅ **Clear guidelines**: UI shows best practices
✅ **Model compatibility**: Works with all GPT models
✅ **Customizable**: Can adjust prompts for specific needs
✅ **Well-documented**: Comprehensive guides and examples

### For Developers
✅ **Modular design**: Prompts in separate module
✅ **Type-safe**: Proper TypeScript/Python typing
✅ **Model-agnostic**: Handles GPT-4, GPT-5, future models
✅ **Maintainable**: Clear separation of concerns

## Usage

### For End Users

1. **Open Caption Editor** in the UI
2. **Select a style** to load training images
3. **Review settings** (optional) - prompts follow best practices by default
4. **Generate captions** - individually or in batch
5. **Review and edit** - captions follow Flux LoRA training rules
6. **Replace [TRIGGER]** with your actual trigger token before training

### For Developers

```python
# Use in Python scripts
from src.utils.caption_prompts import get_caption_prompts

prompts = get_caption_prompts(trigger_token="mystyle")
system_prompt = prompts["system"]
user_prompt = prompts["user"]
```

```typescript
// Already integrated in CaptionEditor.tsx
const DEFAULT_SYSTEM_PROMPT = "..." // Uses new prompts
const DEFAULT_USER_PROMPT = "..."   // Uses new prompts
```

## Testing

To test the new system:

1. **Open Caption Editor** in the UI
2. **Click "Settings"** to review new prompts
3. **Select a few images** and generate captions
4. **Verify captions**:
   - ✅ No style descriptions (colors, medium, aesthetics)
   - ✅ Describes scene content (subject, setting, lighting)
   - ✅ Ends with `[TRIGGER]`
   - ✅ Moderate length (8-20 words + trigger)

## Migration Notes

- **No breaking changes**: System uses new prompts automatically
- **Backward compatible**: Old captions remain unchanged
- **Customization preserved**: Users can still edit prompts in settings
- **Default behavior improved**: New defaults follow best practices

## Related Files

### Created
- `src/utils/caption_prompts.py` - Prompt generation module
- `src/utils/README_CAPTION_PROMPTS.md` - Usage documentation
- `CAPTION_SYSTEM_UPDATE.md` - This summary

### Modified
- `src/utils/openai_client.py` - GPT-5 compatibility
- `scripts/generate_captions.py` - Uses new prompts
- `ui/src/components/CaptionEditor.tsx` - New default prompts
- `ui/src/components/CaptionEditor.css` - Settings note styling

### Referenced
- `docs/CAPTION_GUIDE.md` - Comprehensive caption guidelines (your guide)

## Next Steps

1. **Test caption generation** with different GPT models
2. **Review generated captions** to ensure they follow guidelines
3. **Adjust prompts** if needed for your specific use cases
4. **Train a LoRA** with the new captions to validate quality
5. **Update trigger tokens** in captions before training

## Support

For questions or issues:
- Review `docs/CAPTION_GUIDE.md` for comprehensive guidelines
- Check `src/utils/README_CAPTION_PROMPTS.md` for usage examples
- Examine example captions in the UI settings panel
- Test with different GPT models to find best quality/cost balance
