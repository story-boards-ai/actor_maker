# Scripts Directory

## Overview
This directory contains utility scripts for the Styles Maker project.

## Scripts

### `generate_captions.py`
**Purpose**: Generate image captions using GPT-4 Vision API

**Features**:
- Processes images with OpenAI GPT-4 Vision
- Automatically resizes images to 768px to reduce costs
- Supports batch processing
- Handles base64 encoding for API calls
- Reads input from stdin, outputs JSON to stdout

**Usage**:
```bash
# Via API (recommended)
POST /api/caption/generate

# Direct invocation (for testing)
echo '{"images":[{"filename":"test.jpg","path":"/path/to/image.jpg"}],"systemPrompt":"...","userPrompt":"..."}' | python generate_captions.py
```

**Input Format** (stdin):
```json
{
  "images": [
    {
      "filename": "image.jpg",
      "path": "/resources/input_images/image.jpg"
    }
  ],
  "systemPrompt": "You are an expert image captioning assistant...",
  "userPrompt": "Analyze this image and provide..."
}
```

**Output Format** (stdout):
```json
{
  "success": true,
  "results": [
    {
      "filename": "image.jpg",
      "success": true,
      "caption": "A detailed description of the image..."
    }
  ],
  "total": 1,
  "successful": 1,
  "failed": 0
}
```

**Requirements**:
- Python 3.8+
- `openai>=1.0.0`
- `Pillow>=10.0.0`
- `OPENAI_API_KEY` environment variable

**Error Handling**:
- Missing API key → Exit code 1 with error JSON
- Image not found → Result with `success: false` and error message
- OpenAI API errors → Retries up to 3 times with exponential backoff
- Invalid JSON input → Exit code 1 with parse error

### `sync_styles_from_backend.py`
**Purpose**: Sync styles from the backend story-boards system

**Usage**:
```bash
python sync_styles_from_backend.py
```

## Development

### Adding New Scripts
1. Create script file in this directory
2. Add shebang: `#!/usr/bin/env python3`
3. Make executable: `chmod +x script_name.py`
4. Document in this README
5. Add dependencies to `requirements.txt` if needed

### Testing Scripts
```bash
# Test caption generation
cd /path/to/actor_maker
python scripts/generate_captions.py < test_input.json

# With verbose output
OPENAI_LOG=debug python scripts/generate_captions.py < test_input.json
```

## Integration

Scripts are integrated with the UI via:
- **Vite Middleware** (`ui/vite.config.ts`) for API endpoints
- **Child Process** spawning for Python scripts
- **stdin/stdout** communication for data exchange

## Security Notes

- Never commit API keys to this repository
- Always use environment variables for secrets
- Validate all input data in scripts
- Handle errors gracefully with proper exit codes
