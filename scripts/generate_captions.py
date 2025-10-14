#!/usr/bin/env python3
"""
Generate image captions using GPT Vision API.
Reads input from stdin and outputs JSON results to stdout.
"""
import sys
import json
import os
import base64
from pathlib import Path
from PIL import Image
from io import BytesIO

# Add parent directory to path to import src modules
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Load .env file if it exists
try:
    from dotenv import load_dotenv
    env_path = project_root / '.env'
    if env_path.exists():
        load_dotenv(env_path)
        print(f"Loaded .env from {env_path}", file=sys.stderr)
except ImportError:
    print("Warning: python-dotenv not installed, .env file not loaded", file=sys.stderr)

from src.utils.openai_client import OpenAIClient, OpenAIConfig
from src.utils.gpt_models import DEFAULT_VISION_MODEL, is_vision_model
from src.utils.caption_prompts import get_caption_prompts, DEFAULT_SYSTEM_PROMPT, DEFAULT_USER_PROMPT


def resize_image_for_gpt(image_path: str, max_size: int = 768) -> str:
    """
    Resize image to reduce token usage while maintaining aspect ratio.
    Returns base64 encoded image.
    
    Args:
        image_path: Path to image file
        max_size: Maximum dimension (width or height)
    
    Returns:
        Base64 encoded resized image with data URI prefix
    """
    try:
        with Image.open(image_path) as img:
            # Convert to RGB if necessary (handles RGBA, P, etc.)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Calculate new size maintaining aspect ratio
            width, height = img.size
            if width > max_size or height > max_size:
                if width > height:
                    new_width = max_size
                    new_height = int(height * (max_size / width))
                else:
                    new_height = max_size
                    new_width = int(width * (max_size / height))
                
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Save to BytesIO and convert to base64
            buffer = BytesIO()
            img.save(buffer, format='JPEG', quality=85)
            img_bytes = buffer.getvalue()
            
            # Create base64 string with data URI
            b64_string = base64.b64encode(img_bytes).decode('utf-8')
            return f"data:image/jpeg;base64,{b64_string}"
            
    except Exception as e:
        raise Exception(f"Failed to process image {image_path}: {str(e)}")


def generate_caption(
    client: OpenAIClient,
    image_path: str,
    system_prompt: str,
    user_prompt: str,
    model: str = DEFAULT_VISION_MODEL
) -> dict:
    """
    Generate caption for a single image.
    
    Args:
        client: OpenAI client instance
        image_path: Path to image file
        system_prompt: System message for GPT
        user_prompt: User prompt for caption generation
        model: Vision model to use
    
    Returns:
        Dict with filename and generated caption or error
    """
    filename = os.path.basename(image_path)
    
    try:
        print(f"\n{'='*80}", file=sys.stderr)
        print(f"🎯 [CAPTION-GEN] Starting caption generation for: {filename}", file=sys.stderr)
        print(f"{'='*80}", file=sys.stderr)
        
        # Resize and encode image
        print(f"📸 [IMAGE] Resizing image: {image_path}", file=sys.stderr)
        image_base64 = resize_image_for_gpt(image_path)
        print(f"✅ [IMAGE] Image resized and encoded (base64 length: {len(image_base64)} chars)", file=sys.stderr)
        
        # Determine temperature and max_tokens based on model
        # GPT-5 only supports default temperature (1.0)
        # GPT-5 uses reasoning tokens, so needs higher max_tokens
        is_gpt5 = model.lower().startswith("gpt-5")
        temperature = 1.0 if is_gpt5 else 0.7
        max_tokens = 1000 if is_gpt5 else 300  # GPT-5 needs more tokens for reasoning + output
        
        print(f"\n🤖 [GPT-REQUEST] Preparing request:", file=sys.stderr)
        print(f"   Model: {model}", file=sys.stderr)
        print(f"   Temperature: {temperature}", file=sys.stderr)
        print(f"   Max tokens: {max_tokens}", file=sys.stderr)
        if is_gpt5:
            print(f"   ℹ️  GPT-5 uses reasoning tokens - increased max_tokens to accommodate", file=sys.stderr)
        print(f"   System prompt length: {len(system_prompt) if system_prompt else 0} chars", file=sys.stderr)
        print(f"   User prompt length: {len(user_prompt)} chars", file=sys.stderr)
        print(f"\n📝 [SYSTEM-PROMPT]:\n{system_prompt[:200]}...", file=sys.stderr)
        print(f"\n📝 [USER-PROMPT]:\n{user_prompt[:200]}...", file=sys.stderr)
        
        print(f"\n🚀 [GPT-REQUEST] Sending request to OpenAI API...", file=sys.stderr)
        
        # Generate caption using vision model
        # The OpenAIClient will handle GPT-5 parameter differences automatically
        caption = client.vision_completion(
            prompt=user_prompt,
            image_base64=image_base64,
            model=model,
            system_message=system_prompt if system_prompt else None,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        print(f"✅ [GPT-RESPONSE] Received response from OpenAI", file=sys.stderr)
        print(f"📄 [CAPTION] Generated caption ({len(caption)} chars):", file=sys.stderr)
        print(f"   \"{caption}\"", file=sys.stderr)
        
        # Check if caption is empty
        if not caption or not caption.strip():
            print(f"⚠️  [WARNING] Caption is empty! This might indicate:", file=sys.stderr)
            print(f"   - GPT returned an empty response", file=sys.stderr)
            print(f"   - API error that wasn't caught", file=sys.stderr)
            print(f"   - Prompt issues causing no output", file=sys.stderr)
        
        print(f"{'='*80}\n", file=sys.stderr)
        
        return {
            'filename': filename,
            'success': True,
            'caption': caption.strip()
        }
        
    except Exception as e:
        print(f"❌ [ERROR] Caption generation failed for {filename}:", file=sys.stderr)
        print(f"   Error: {str(e)}", file=sys.stderr)
        print(f"{'='*80}\n", file=sys.stderr)
        return {
            'filename': filename,
            'success': False,
            'error': str(e)
        }


def main():
    """Main function to process caption generation requests."""
    try:
        # Validate API key
        if not OpenAIConfig.OPENAI_API_KEY:
            result = {
                'success': False,
                'error': 'OPENAI_API_KEY environment variable is not set'
            }
            print(json.dumps(result))
            sys.exit(1)
        
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        images = input_data.get('images', [])
        
        # Use provided prompts or fall back to defaults from caption_prompts.py
        # The defaults follow Flux LoRA training best practices (see docs/CAPTION_GUIDE.md)
        system_prompt = input_data.get('systemPrompt', DEFAULT_SYSTEM_PROMPT)
        user_prompt = input_data.get('userPrompt', DEFAULT_USER_PROMPT)
        model = input_data.get('model', DEFAULT_VISION_MODEL)
        
        if not images:
            result = {
                'success': False,
                'error': 'No images provided'
            }
            print(json.dumps(result))
            sys.exit(1)
        
        if not user_prompt:
            result = {
                'success': False,
                'error': 'User prompt is required'
            }
            print(json.dumps(result))
            sys.exit(1)
        
        # Initialize OpenAI client
        client = OpenAIClient()
        
        # Process each image
        results = []
        for img_data in images:
            image_path = img_data.get('path', '')
            
            if not os.path.exists(image_path):
                results.append({
                    'filename': img_data.get('filename', ''),
                    'success': False,
                    'error': f'Image file not found: {image_path}'
                })
                continue
            
            result = generate_caption(client, image_path, system_prompt, user_prompt, model)
            results.append(result)
        
        # Output results as JSON
        output = {
            'success': True,
            'results': results,
            'total': len(results),
            'successful': sum(1 for r in results if r['success']),
            'failed': sum(1 for r in results if not r['success'])
        }
        
        print(json.dumps(output))
        
    except json.JSONDecodeError as e:
        result = {
            'success': False,
            'error': f'Invalid JSON input: {str(e)}'
        }
        print(json.dumps(result))
        sys.exit(1)
        
    except Exception as e:
        result = {
            'success': False,
            'error': f'Unexpected error: {str(e)}'
        }
        print(json.dumps(result))
        sys.exit(1)


if __name__ == '__main__':
    main()
