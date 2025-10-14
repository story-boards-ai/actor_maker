#!/usr/bin/env python3
"""
Generate image prompts using GPT Vision API.
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


def generatePrompt(
    client: OpenAIClient,
    image_path: str,
    system_prompt: str,
    user_prompt: str,
    model: str = DEFAULT_VISION_MODEL
) -> dict:
    """
    Generate prompt for a single image.
    
    Args:
        client: OpenAI client instance
        image_path: Path to image file
        system_prompt: System message for GPT
        user_prompt: User prompt for prompt generation
    
    Returns:
        Dict with filename and generated prompt or error
    """
    filename = os.path.basename(image_path)
    
    try:
        # Resize and encode image
        image_base64 = resize_image_for_gpt(image_path)
        
        # Generate prompt using vision model
        prompt = client.vision_completion(
            prompt=user_prompt,
            image_base64=image_base64,
            model=model,
            system_message=system_prompt if system_prompt else None,
            temperature=0.7,
            max_tokens=300
        )
        
        return {
            'filename': filename,
            'success': True,
            'prompt': prompt.strip()
        }
        
    except Exception as e:
        return {
            'filename': filename,
            'success': False,
            'error': str(e)
        }


def main():
    """Main function to process prompt generation requests."""
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
        system_prompt = input_data.get('systemPrompt', '')
        user_prompt = input_data.get('userPrompt', '')
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
            
            # Convert web path to filesystem path
            if image_path.startswith('/resources/'):
                # Remove /resources/ prefix and resolve relative to project root
                relative_path = image_path.replace('/resources/', '')
                fs_path = os.path.join(
                    os.path.dirname(os.path.dirname(__file__)),
                    'resources',
                    relative_path.replace('/', os.sep)
                )
                # URL decode the filename
                from urllib.parse import unquote
                fs_path = unquote(fs_path)
            else:
                fs_path = image_path
            
            if not os.path.exists(fs_path):
                results.append({
                    'filename': img_data.get('filename', ''),
                    'success': False,
                    'error': f'Image file not found: {fs_path}'
                })
                continue
            
            result = generatePrompt(client, fs_path, system_prompt, user_prompt, model)
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
