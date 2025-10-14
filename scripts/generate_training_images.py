#!/usr/bin/env python3
"""
Generate training images in batch using img2img workflow.
Reads input from stdin and outputs JSON results to stdout.
"""
import sys
import json
import os
import base64
import logging
from pathlib import Path
from dotenv import load_dotenv
from PIL import Image, ImageEnhance
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

from src.runpod import generate_serverless_image

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(message)s',
    stream=sys.stderr
)
logger = logging.getLogger(__name__)


def apply_monochrome_filter(image: Image.Image, contrast: float, brightness: float) -> Image.Image:
    """
    Apply monochrome (grayscale) filter with contrast and brightness adjustments.
    
    Args:
        image: PIL Image object
        contrast: Contrast multiplier (e.g., 1.2)
        brightness: Brightness multiplier (e.g., 1.0)
    
    Returns:
        Filtered PIL Image
    """
    # Convert to grayscale
    grayscale = image.convert('L')
    
    # Convert back to RGB mode (required for further processing)
    rgb_grayscale = Image.new('RGB', grayscale.size)
    rgb_grayscale.paste(grayscale)
    
    # Apply contrast adjustment
    if contrast != 1.0:
        enhancer = ImageEnhance.Contrast(rgb_grayscale)
        rgb_grayscale = enhancer.enhance(contrast)
    
    # Apply brightness adjustment
    if brightness != 1.0:
        enhancer = ImageEnhance.Brightness(rgb_grayscale)
        rgb_grayscale = enhancer.enhance(brightness)
    
    return rgb_grayscale


def encode_image_to_base64(image_path: str, apply_monochrome: bool = False, 
                           mono_contrast: float = 1.0, mono_brightness: float = 1.0) -> str:
    """
    Read image file, optionally apply monochrome filter, and convert to base64 string.
    
    Args:
        image_path: Path to image file
        apply_monochrome: Whether to apply monochrome filter
        mono_contrast: Contrast multiplier for monochrome
        mono_brightness: Brightness multiplier for monochrome
    
    Returns:
        Base64 encoded string
    """
    try:
        # Load image with PIL
        with Image.open(image_path) as img:
            # Convert to RGB if necessary
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Apply monochrome filter if requested
            if apply_monochrome:
                img = apply_monochrome_filter(img, mono_contrast, mono_brightness)
                logger.info(f"  Applied monochrome filter (contrast: {mono_contrast}, brightness: {mono_brightness})")
            
            # Convert to JPEG bytes
            buffer = BytesIO()
            img.save(buffer, format='JPEG', quality=95)
            image_bytes = buffer.getvalue()
            
            # Encode to base64
            b64_string = base64.b64encode(image_bytes).decode('utf-8')
            return b64_string
    except Exception as e:
        raise Exception(f"Failed to encode image {image_path}: {str(e)}")


def generate_training_image(
    image_data: dict,
    workflow: dict,
    settings: dict,
    style_lora_name: str,
    lora_strength_model: float,
    lora_strength_clip: float,
    prompt_frontpad: str,
    prompt_backpad: str,
    is_monochrome: bool,
    monochrome_contrast: float,
    monochrome_brightness: float,
    api_key: str
) -> dict:
    """
    Generate a single training image using img2img workflow.
    
    Args:
        image_data: Dict with filename and path
        workflow: ComfyUI workflow JSON
        settings: Generation settings (seed, steps, cfg, etc.)
        style_lora_name: LoRA model name
        lora_strength_model: LoRA strength for model
        lora_strength_clip: LoRA strength for CLIP
        prompt_frontpad: Front padding for prompt
        prompt_backpad: Back padding for prompt
        api_key: RunPod API key
    
    Returns:
        Dict with filename, success status, and result or error
    """
    filename = image_data.get('filename', '')
    fs_path = image_data.get('fs_path', '')
    
    try:
        logger.info(f"Processing: {filename}")
        
        # Encode image to base64 (with monochrome filter if applicable)
        base64_image = encode_image_to_base64(
            fs_path, 
            apply_monochrome=is_monochrome,
            mono_contrast=monochrome_contrast,
            mono_brightness=monochrome_brightness
        )
        logger.info(f"  Image encoded: {len(base64_image)} bytes")
        
        # Get caption if available
        caption = image_data.get('caption', '')
        if not caption:
            logger.warning(f"  No caption available for {filename}")
            caption = "a movie scene"
        
        # Build full prompt with padding
        full_prompt = f"{prompt_frontpad}, {caption}, {prompt_backpad}".strip(', ')
        logger.info(f"  Prompt: {full_prompt[:100]}...")
        
        # Clone workflow and update nodes
        workflow_copy = json.loads(json.dumps(workflow))
        
        # Update source image (node 216)
        if '216' in workflow_copy:
            workflow_copy['216']['inputs']['base64_data'] = base64_image
        
        # Update LoRA loader (node 205)
        if '205' in workflow_copy:
            workflow_copy['205']['inputs']['lora_name'] = style_lora_name
            workflow_copy['205']['inputs']['strength_model'] = lora_strength_model
            workflow_copy['205']['inputs']['strength_clip'] = lora_strength_clip
        
        # Update positive prompt (node 132)
        if '132' in workflow_copy:
            workflow_copy['132']['inputs']['t5xxl'] = full_prompt
            workflow_copy['132']['inputs']['guidance'] = settings.get('guidance', 3.5)
        
        # Update KSampler settings (node 150)
        if '150' in workflow_copy:
            workflow_copy['150']['inputs']['seed'] = settings.get('seed', 123467)
            workflow_copy['150']['inputs']['steps'] = settings.get('steps', 20)
            workflow_copy['150']['inputs']['cfg'] = settings.get('cfg', 1)
            workflow_copy['150']['inputs']['sampler_name'] = settings.get('samplerName', 'euler')
            workflow_copy['150']['inputs']['scheduler'] = settings.get('schedulerName', 'ddim_uniform')
            workflow_copy['150']['inputs']['denoise'] = settings.get('denoise', 0.8)
        
        # Update image dimensions (node 215)
        if '215' in workflow_copy:
            workflow_copy['215']['inputs']['width'] = settings.get('width', 1360)
            workflow_copy['215']['inputs']['height'] = settings.get('height', 768)
        
        # Build payload
        payload = {
            'input': {
                'workflow': workflow_copy,
                'model_urls': []
            }
        }
        
        # Call RunPod serverless
        logger.info(f"  Calling RunPod...")
        result = generate_serverless_image(
            payload=payload,
            mode='150',
            request_id=f"training_{filename}",
            api_key=api_key
        )
        
        if result and result.get('status') == 'COMPLETED':
            logger.info(f"  ✅ SUCCESS: {filename}")
            return {
                'filename': filename,
                'success': True,
                'result': result
            }
        else:
            error_msg = result.get('error', 'Generation failed') if result else 'No result returned'
            logger.error(f"  ❌ FAILED: {filename} - {error_msg}")
            return {
                'filename': filename,
                'success': False,
                'error': error_msg
            }
    
    except Exception as e:
        logger.error(f"  ❌ ERROR: {filename} - {str(e)}")
        return {
            'filename': filename,
            'success': False,
            'error': str(e)
        }


def main():
    """Main function to process training image generation requests."""
    try:
        # Validate API key
        api_key = os.getenv('RUNPOD_API_KEY')
        if not api_key:
            result = {
                'success': False,
                'error': 'RUNPOD_API_KEY environment variable is not set'
            }
            print(json.dumps(result))
            sys.exit(1)
        
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        images = input_data.get('images', [])
        workflow = input_data.get('workflow', {})
        settings = input_data.get('settings', {})
        style_lora_name = input_data.get('styleLoraName', '')
        lora_strength_model = input_data.get('loraStrengthModel', 1.0)
        lora_strength_clip = input_data.get('loraStrengthClip', 1.0)
        prompt_frontpad = input_data.get('promptFrontpad', '')
        prompt_backpad = input_data.get('promptBackpad', '')
        is_monochrome = input_data.get('isMonochrome', False)
        monochrome_contrast = input_data.get('monochromeContrast', 1.0)
        monochrome_brightness = input_data.get('monochromeBrightness', 1.0)
        randomize_seed_per_image = settings.get('randomizeSeedPerImage', False)
        base_seed = settings.get('seed', 0)
        
        if not images:
            result = {
                'success': False,
                'error': 'No images provided'
            }
            print(json.dumps(result))
            sys.exit(1)
        
        if not workflow:
            result = {
                'success': False,
                'error': 'No workflow provided'
            }
            print(json.dumps(result))
            sys.exit(1)
        
        logger.info(f"Starting batch generation for {len(images)} images")
        logger.info(f"Style LoRA: {style_lora_name}")
        logger.info(f"Monochrome: {is_monochrome}")
        if is_monochrome:
            logger.info(f"  - Contrast: {monochrome_contrast}")
            logger.info(f"  - Brightness: {monochrome_brightness}")
        if randomize_seed_per_image:
            logger.info(f"🎲 Randomizing seed for each image (base seed: {base_seed})")
        logger.info(f"Settings: {settings}")
        
        # Process each image
        results = []
        for i, img_data in enumerate(images, 1):
            logger.info(f"[{i}/{len(images)}] Processing {img_data.get('filename', 'unknown')}")
            
            # Use a random seed for each image if enabled
            current_settings = settings.copy()
            if randomize_seed_per_image:
                import random
                random.seed(base_seed + i)  # Deterministic random based on base seed + index
                current_settings['seed'] = random.randint(0, 999999)
                logger.info(f"  🎲 Using random seed: {current_settings['seed']}")
            
            result = generate_training_image(
                image_data=img_data,
                workflow=workflow,
                settings=current_settings,
                style_lora_name=style_lora_name,
                lora_strength_model=lora_strength_model,
                lora_strength_clip=lora_strength_clip,
                prompt_frontpad=prompt_frontpad,
                prompt_backpad=prompt_backpad,
                is_monochrome=is_monochrome,
                monochrome_contrast=monochrome_contrast,
                monochrome_brightness=monochrome_brightness,
                api_key=api_key
            )
            results.append(result)
        
        # Output results as JSON
        output = {
            'success': True,
            'results': results,
            'total': len(results),
            'successful': sum(1 for r in results if r['success']),
            'failed': sum(1 for r in results if not r['success'])
        }
        
        logger.info(f"Batch complete: {output['successful']} succeeded, {output['failed']} failed")
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
