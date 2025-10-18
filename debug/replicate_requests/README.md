# Replicate Request Logging

This folder contains detailed logs of all Replicate API requests made during training image generation.

## File Format

Each actor has up to three files (overwritten on each generation):

### 1. Request File (`{actor_name}_request.json`)
Contains the full request sent to Replicate:
```json
{
  "timestamp": "2025-10-18T13:03:45.123456",
  "actor_id": "0285",
  "actor_name": "0285_south_american_13_male",
  "base_image_url": "https://...",
  "prompt": "Full prompt text here...",
  "aspect_ratio": "16:9",
  "output_format": "jpg",
  "model": "black-forest-labs/flux-kontext-pro",
  "input_image_size_bytes": 332280
}
```

### 2. Response File (`{actor_name}_response.json`)
Contains the successful response:
```json
{
  "timestamp": "2025-10-18T13:03:58.789012",
  "actor_id": "0285",
  "actor_name": "0285_south_american_13_male",
  "generated_url": "https://replicate.delivery/...",
  "success": true
}
```

### 3. Error File (`{actor_name}_error.json`)
Created only if generation fails:
```json
{
  "timestamp": "2025-10-18T13:03:58.789012",
  "actor_id": "0285",
  "actor_name": "0285_south_american_13_male",
  "error": "Error message here",
  "success": false
}
```

## Purpose

These logs help you:
- **Debug issues** - See exactly what was sent to Replicate
- **Verify prompts** - Confirm the full prompt text being used
- **Track generations** - Audit trail of all image generations
- **Analyze failures** - Understand why generations failed

## File Naming

Format: `{actor_name}_{type}.json`

Example:
- `0285_south_american_13_male_request.json`
- `0285_south_american_13_male_response.json`
- `0285_south_american_13_male_error.json`

## Notes

- Files are created automatically during generation
- **Files are overwritten** on each generation (no history kept)
- Check the `timestamp` field inside the JSON for when it was generated
- This folder is gitignored (not committed to repository)
- Files include full prompt text (not truncated)
- Only the latest request/response for each actor is kept
