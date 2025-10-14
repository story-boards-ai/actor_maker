# Debug Files

This directory contains debug output from image generation requests.

## Files

### `img2img_request.json`
The complete request payload sent to RunPod serverless, including:
- Workflow definition
- Style LoRA configuration
- Source image (base64)
- Prompt
- Model URLs

**Overwritten on each generation request.**

### `img2img_response.json`
The complete response received from RunPod serverless, including:
- Status
- Generated image URLs (replaced with local URLs)
- Error messages (if any)
- Execution metadata

**Overwritten on each successful response.**

### `img2img_result.jpg`
The actual generated image downloaded from RunPod and saved locally.
- Prevents "431 Request Header Fields Too Large" errors
- Served via `/debug/img2img_result.jpg`
- JPEG format

**Overwritten on each successful generation.**

### `img2img_settings.json`
Saved workflow settings (seed, steps, cfg, denoise, guidance, dimensions, sampler, scheduler).
- Automatically loaded on app start
- Saved via 💾 button in Advanced Settings
- Reset via ↺ button in Advanced Settings

**Persists between sessions.**

## Usage

These files are automatically created/updated when you generate images via the Image Generation tab.

They are useful for:
- Debugging response structure issues
- Verifying request payload format
- Troubleshooting generation failures
- Understanding the full request/response cycle

## Note

These files are **gitignored** and will not be committed to version control.
