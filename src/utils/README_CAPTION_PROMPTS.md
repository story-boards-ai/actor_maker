# Caption Prompts Utility

This module provides optimized prompts for generating training captions for Flux LoRA style models.

## Overview

The prompts follow best practices from the comprehensive [Caption Guide](../../docs/CAPTION_GUIDE.md) and are designed to:

- **Avoid describing the style** (it's learned implicitly through the trigger token)
- **Focus on scene content** that varies between images
- **Caption elements** you want prompt control over later
- **Keep captions moderate length** (8-20 words + trigger)
- **Prevent overfitting** through varied descriptions

## Usage

### Basic Usage

```python
from src.utils.caption_prompts import get_caption_prompts

# Get prompts with a specific trigger token
prompts = get_caption_prompts(trigger_token="mystyle")

system_prompt = prompts["system"]
user_prompt = prompts["user"]
```

### With Default Placeholder

```python
from src.utils.caption_prompts import DEFAULT_SYSTEM_PROMPT, DEFAULT_USER_PROMPT

# Uses [TRIGGER] as placeholder
system_prompt = DEFAULT_SYSTEM_PROMPT
user_prompt = DEFAULT_USER_PROMPT
```

### In Caption Generation Script

The `generate_captions.py` script automatically uses these prompts as defaults:

```python
# Prompts are used automatically if not provided
# You can override them via the API/UI settings panel
```

## Prompt Structure

### System Prompt

Defines GPT's role and critical rules:
- Never describe style elements (colors, brush strokes, artistic medium)
- Only describe variable scene content
- Caption elements for prompt control
- Keep moderate length
- Always include trigger token
- Vary descriptions

### User Prompt

Provides specific instructions with examples:
- **DESCRIBE**: Subject, objects, setting, lighting, weather, camera, character details
- **DON'T DESCRIBE**: Artistic medium, color mood, textures, aesthetic qualities
- **EXAMPLES**: Good vs bad caption comparisons

## Integration with GPT Models

The prompts work with all GPT vision models:

- **GPT-4o**: Best quality, higher cost
- **GPT-4o Mini**: Balanced cost and quality
- **GPT-4.1 / 4.1 Mini**: Large context window
- **GPT-5 / 5 Mini / 5 Nano**: Next-gen models (when available)

The `OpenAIClient` automatically handles model-specific requirements:
- GPT-5 uses `max_completion_tokens` instead of `max_tokens`
- GPT-5 only supports default temperature (1.0)
- All models support system and user prompts

## Customization

You can customize the prompts in the UI settings panel or by modifying `caption_prompts.py`:

```python
def get_caption_prompts(trigger_token: str = None) -> dict:
    # Modify the system_prompt and user_prompt strings
    # to match your specific training needs
    ...
```

## Best Practices

1. **Use the trigger token**: Always append it to captions for proper LoRA training
2. **Vary your captions**: Different descriptions prevent overfitting
3. **Focus on content**: Describe what's in the scene, not how it looks artistically
4. **Keep it moderate**: 8-20 words is optimal for most use cases
5. **Test and iterate**: Generate a few captions, review them, adjust prompts if needed

## Related Documentation

- [Caption Guide](../../docs/CAPTION_GUIDE.md) - Comprehensive captioning guidelines
- [OpenAI Client](./openai_client.py) - GPT API integration
- [Generate Captions Script](../../scripts/generate_captions.py) - Batch caption generation
