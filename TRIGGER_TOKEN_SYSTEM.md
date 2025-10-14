# Trigger Token System for Style LoRA Training

## Overview

The caption generation system automatically replaces `[TRIGGER]` placeholders with the actual style-specific trigger token in the format `SBai_style_ID`.

## Trigger Token Format

```
SBai_style_{styleId}
```

### Examples:
- Style ID `16` → `SBai_style_16`
- Style ID `2` → `SBai_style_2`
- Style ID `101` → `SBai_style_101`

## How It Works

### 1. **Prompts Use Placeholder**

The system and user prompts contain `[TRIGGER]` as a placeholder:

```
FORMAT: [scene description with variable elements], [TRIGGER]

EXAMPLE: "a woman sitting on a park bench reading a book, [TRIGGER]"
```

### 2. **Automatic Replacement**

When generating captions, the backend automatically replaces `[TRIGGER]` with the actual trigger token:

**File**: `ui/config/routes/captions-api.ts`

```typescript
// Generate trigger token for this style (format: SBai_style_16)
const triggerToken = `SBai_style_${styleId}`

// Replace [TRIGGER] placeholder with actual trigger token in prompts
const finalSystemPrompt = systemPrompt.replace(/\[TRIGGER\]/g, triggerToken)
const finalUserPrompt = userPrompt.replace(/\[TRIGGER\]/g, triggerToken)
```

### 3. **Generated Captions**

The final captions contain the actual trigger token:

```
Input prompt: "a woman sitting on a park bench reading a book, [TRIGGER]"
Generated caption: "a woman sitting on a park bench reading a book, SBai_style_16"
```

## Example Flow

### Style: 16_dynamic_simplicity

**1. User selects style in Caption Editor**
- Style ID: `16`
- Trigger token will be: `SBai_style_16`

**2. System sends prompts with [TRIGGER]**
```
System Prompt: "...Always end the caption with ' [TRIGGER]'..."
User Prompt: "...EXAMPLE: 'a foggy mountain valley, [TRIGGER]'..."
```

**3. Backend replaces [TRIGGER]**
```typescript
triggerToken = "SBai_style_16"
finalSystemPrompt = systemPrompt.replace(/\[TRIGGER\]/g, "SBai_style_16")
finalUserPrompt = userPrompt.replace(/\[TRIGGER\]/g, "SBai_style_16")
```

**4. GPT receives actual trigger token**
```
System Prompt: "...Always end the caption with ' SBai_style_16'..."
User Prompt: "...EXAMPLE: 'a foggy mountain valley, SBai_style_16'..."
```

**5. GPT generates caption with trigger**
```
"a cozy living room with Christmas trees, gifts, and a lit fireplace, SBai_style_16"
```

**6. Caption saved to file**
```
File: A Boy and a Girl_scene_1_shot_1 (1).txt
Content: "a cozy living room with Christmas trees, gifts, and a lit fireplace, SBai_style_16"
```

## Benefits

### ✅ **Consistency**
- All captions for a style use the same trigger token
- No manual editing required
- No risk of typos or inconsistent formatting

### ✅ **Flexibility**
- Users can customize prompts without worrying about trigger tokens
- Trigger token is automatically correct for each style
- Easy to update trigger format in one place if needed

### ✅ **User-Friendly**
- Users see `[TRIGGER]` in the UI (clear placeholder)
- System handles the replacement automatically
- No need to remember or type the trigger token format

## Files Modified

### Backend
- `ui/config/routes/captions-api.ts` - Automatic trigger token replacement

### Frontend
- `ui/src/components/CaptionEditor.tsx` - Updated prompts and documentation

### Python
- `src/utils/caption_prompts.py` - Documentation of trigger token system

## Usage

### For Users

1. **In Caption Editor**: Use `[TRIGGER]` in your custom prompts
2. **System handles it**: Automatic replacement with `SBai_style_ID`
3. **Generated captions**: Contain the actual trigger token

### For Developers

```typescript
// The trigger token is automatically generated from styleId
const triggerToken = `SBai_style_${styleId}`

// All occurrences of [TRIGGER] are replaced
const finalPrompt = prompt.replace(/\[TRIGGER\]/g, triggerToken)
```

## Training Usage

When training a Flux LoRA with these captions:

1. **Caption files** contain the trigger token (e.g., `SBai_style_16`)
2. **Training process** learns to associate the trigger with the style
3. **At inference time** use the trigger token in prompts:
   ```
   "a mountain landscape at sunset, SBai_style_16"
   ```

## Logging

The system logs the trigger token being used:

```
📌 [CAPTION-GEN] Using trigger token: SBai_style_16
```

This appears in the console when generating captions, confirming the correct trigger is being used.
