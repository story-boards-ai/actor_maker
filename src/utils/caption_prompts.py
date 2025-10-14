"""
Caption generation prompts based on best practices for Flux LoRA training.

These prompts follow the guidelines from CAPTION_GUIDE.md:
- Caption elements you want to prompt in or out
- Don't describe the style itself (it's encoded by the trigger token)
- Vary captions to prevent overfitting
- Keep captions moderate length (8-20 words + trigger)
- Be specific about scene content, not style aesthetics

TRIGGER TOKEN FORMAT:
- The trigger token follows the format: SBai_style_ID (e.g., SBai_style_16)
- When using these prompts, [TRIGGER] is replaced with the actual style ID
- This happens automatically in the caption generation API
"""

def get_caption_prompts(trigger_token: str = None) -> dict:
    """
    Get system and user prompts for caption generation.
    
    Args:
        trigger_token: Optional trigger token to append to captions.
                      If None, prompts will instruct to use a placeholder.
    
    Returns:
        Dict with 'system' and 'user' prompt strings
    """
    
    trigger_instruction = (
        f'Always end the caption with " {trigger_token}"'
        if trigger_token
        else 'Always end the caption with " [TRIGGER]" as a placeholder for the style trigger token'
    )
    
    trigger_example = trigger_token if trigger_token else "[TRIGGER]"
    
    system_prompt = f"""You are an expert at creating training captions for Flux LoRA style models.

CRITICAL RULES FOR STYLE LORA TRAINING:

1. NEVER describe the style itself (e.g. "oil painting", "vibrant colors", "soft brush strokes")
   - The style is encoded implicitly through the trigger token
   - Style descriptors interfere with proper LoRA learning

2. ONLY describe scene content that varies between images:
   - Subject(s) and what they're doing
   - Objects, props, and their positions
   - Background elements (landscape, architecture, weather)
   - Lighting conditions (direction, intensity, time of day)
   - Camera framing and composition
   - Pose, gaze, expression (for characters)

3. Caption elements you want to prompt IN or OUT later:
   - If you want flexibility to add/remove "smiling" → caption it
   - If you want to vary "forest" vs "city" → caption the setting
   - If something should be fixed to the style → DON'T caption it

4. Keep captions moderate length (8-20 words) + trigger token

5. {trigger_instruction}

6. Vary your descriptions across images to prevent overfitting

FORMAT: [scene description with variable elements], {trigger_example}"""

    user_prompt = f"""Analyze this image and create a training caption following these rules:

DESCRIBE (things that vary or you want prompt control over):
- Main subject(s): what they are, doing, position, pose
- Objects and props: what's present, where they are
- Setting: location type, environment, background elements
- Lighting: direction, intensity, natural/artificial, time of day
- Weather/atmosphere: if visible (fog, rain, clear sky, etc.)
- Camera: framing, angle, composition type
- Character details: gaze direction, expression, pose (if applicable)

DO NOT DESCRIBE (style elements):
- Artistic medium (painting, illustration, photograph)
- Color palette or color mood (vibrant, muted, pastel)
- Brush strokes, textures, or artistic techniques
- Aesthetic qualities (beautiful, dramatic, moody)
- Style-related adjectives unless they're scene facts

EXAMPLES:

Good: "a woman sitting on a park bench reading a book, autumn trees in background, soft afternoon light, {trigger_example}"

Bad: "a beautifully painted woman in vibrant autumn colors with soft brush strokes, {trigger_example}"

Good: "a foggy mountain valley with pine trees, winding river in foreground, overcast sky, {trigger_example}"

Bad: "a moody atmospheric landscape painting with misty mountains in muted tones, {trigger_example}"

Good: "portrait of a girl on a swing under cherry blossom trees, smiling, backlit by golden hour sun, {trigger_example}"

Bad: "a dreamy pastel portrait of a girl with soft lighting and romantic mood, {trigger_example}"

Now create a caption for this image. Output ONLY the caption text, nothing else."""

    return {
        "system": system_prompt,
        "user": user_prompt
    }


# Default prompts without trigger token (for general use)
DEFAULT_CAPTION_PROMPTS = get_caption_prompts()

# Convenience accessors
DEFAULT_SYSTEM_PROMPT = DEFAULT_CAPTION_PROMPTS["system"]
DEFAULT_USER_PROMPT = DEFAULT_CAPTION_PROMPTS["user"]
