"""
Image processing utilities.
Handles image format conversion, resizing, and encoding.
"""
import base64
import io
import logging
from typing import Union, Optional, Tuple
from PIL import Image

logger = logging.getLogger(__name__)


def convert_to_buffer(data: Union[str, bytes, Image.Image]) -> bytes:
    """
    Convert various image formats to bytes buffer.
    
    Args:
        data: Image data as base64 string, bytes, or PIL Image
    
    Returns:
        Image data as bytes
    """
    if isinstance(data, bytes):
        return data
    
    if isinstance(data, str):
        # Handle base64 encoded strings
        # Remove data URI prefix if present
        if data.startswith('data:'):
            # Extract base64 data after comma
            data = data.split(',', 1)[1] if ',' in data else data
        
        # Remove whitespace
        data = data.strip()
        
        # Decode base64
        try:
            return base64.b64decode(data)
        except Exception as e:
            logger.error(f"Failed to decode base64 string: {e}")
            raise ValueError("Invalid base64 string")
    
    if isinstance(data, Image.Image):
        # Convert PIL Image to bytes
        buffer = io.BytesIO()
        # Determine format
        format = data.format or 'JPEG'
        data.save(buffer, format=format)
        return buffer.getvalue()
    
    raise TypeError(f"Unsupported data type: {type(data)}")


def image_to_base64(
    image: Union[bytes, Image.Image, str],
    format: str = "JPEG"
) -> str:
    """
    Convert image to base64 encoded string.
    
    Args:
        image: Image as bytes, PIL Image, or file path
        format: Output format (JPEG, PNG, WEBP)
    
    Returns:
        Base64 encoded string
    """
    if isinstance(image, str):
        # Assume it's a file path
        with open(image, 'rb') as f:
            image_bytes = f.read()
    elif isinstance(image, Image.Image):
        buffer = io.BytesIO()
        image.save(buffer, format=format)
        image_bytes = buffer.getvalue()
    elif isinstance(image, bytes):
        image_bytes = image
    else:
        raise TypeError(f"Unsupported image type: {type(image)}")
    
    # Encode to base64
    base64_string = base64.b64encode(image_bytes).decode('utf-8')
    return base64_string


def base64_to_image(base64_string: str) -> Image.Image:
    """
    Convert base64 string to PIL Image.
    
    Args:
        base64_string: Base64 encoded image string
    
    Returns:
        PIL Image object
    """
    # Remove data URI prefix if present
    if base64_string.startswith('data:'):
        base64_string = base64_string.split(',', 1)[1]
    
    # Decode base64
    image_bytes = base64.b64decode(base64_string)
    
    # Create PIL Image
    return Image.open(io.BytesIO(image_bytes))


def resize_image(
    image: Union[bytes, Image.Image],
    width: Optional[int] = None,
    height: Optional[int] = None,
    max_size: Optional[int] = None,
    maintain_aspect: bool = True
) -> Image.Image:
    """
    Resize an image.
    
    Args:
        image: Image as bytes or PIL Image
        width: Target width (optional)
        height: Target height (optional)
        max_size: Maximum dimension (uses for both width and height if set)
        maintain_aspect: Whether to maintain aspect ratio
    
    Returns:
        Resized PIL Image
    """
    # Convert to PIL Image if needed
    if isinstance(image, bytes):
        img = Image.open(io.BytesIO(image))
    else:
        img = image
    
    original_width, original_height = img.size
    
    # Determine target size
    if max_size:
        width = max_size
        height = max_size
    
    if maintain_aspect and width and height:
        # Calculate aspect ratio
        img.thumbnail((width, height), Image.Resampling.LANCZOS)
        return img
    elif width and height:
        # Exact resize
        return img.resize((width, height), Image.Resampling.LANCZOS)
    elif width:
        # Resize by width, maintain aspect
        aspect = original_height / original_width
        new_height = int(width * aspect)
        return img.resize((width, new_height), Image.Resampling.LANCZOS)
    elif height:
        # Resize by height, maintain aspect
        aspect = original_width / original_height
        new_width = int(height * aspect)
        return img.resize((new_width, height), Image.Resampling.LANCZOS)
    else:
        return img


def convert_image_format(
    image: Union[bytes, Image.Image],
    format: str = "JPEG",
    quality: int = 95
) -> bytes:
    """
    Convert image to specified format.
    
    Args:
        image: Image as bytes or PIL Image
        format: Target format (JPEG, PNG, WEBP)
        quality: Quality for lossy formats (1-100)
    
    Returns:
        Image data as bytes in target format
    """
    # Convert to PIL Image if needed
    if isinstance(image, bytes):
        img = Image.open(io.BytesIO(image))
    else:
        img = image
    
    # Convert RGBA to RGB for JPEG
    if format.upper() == 'JPEG' and img.mode in ('RGBA', 'LA', 'P'):
        # Create white background
        background = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
        img = background
    
    # Save to buffer
    buffer = io.BytesIO()
    save_kwargs = {'format': format.upper()}
    
    if format.upper() in ('JPEG', 'WEBP'):
        save_kwargs['quality'] = quality
    
    img.save(buffer, **save_kwargs)
    return buffer.getvalue()


def get_image_info(image: Union[bytes, Image.Image, str]) -> dict:
    """
    Get information about an image.
    
    Args:
        image: Image as bytes, PIL Image, or file path
    
    Returns:
        Dict with image information (width, height, format, mode, size_bytes)
    """
    if isinstance(image, str):
        # File path
        img = Image.open(image)
        import os
        size_bytes = os.path.getsize(image)
    elif isinstance(image, bytes):
        img = Image.open(io.BytesIO(image))
        size_bytes = len(image)
    else:
        img = image
        # Calculate size by saving to buffer
        buffer = io.BytesIO()
        img.save(buffer, format=img.format or 'PNG')
        size_bytes = len(buffer.getvalue())
    
    return {
        'width': img.width,
        'height': img.height,
        'format': img.format,
        'mode': img.mode,
        'size_bytes': size_bytes,
        'size_kb': size_bytes / 1024,
        'size_mb': size_bytes / (1024 * 1024),
    }


def create_thumbnail(
    image: Union[bytes, Image.Image],
    size: Tuple[int, int] = (256, 256)
) -> bytes:
    """
    Create a thumbnail of an image.
    
    Args:
        image: Image as bytes or PIL Image
        size: Thumbnail size as (width, height) tuple
    
    Returns:
        Thumbnail image data as bytes
    """
    # Convert to PIL Image if needed
    if isinstance(image, bytes):
        img = Image.open(io.BytesIO(image))
    else:
        img = image.copy()
    
    # Create thumbnail
    img.thumbnail(size, Image.Resampling.LANCZOS)
    
    # Convert to bytes
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG', quality=85)
    return buffer.getvalue()


def validate_image(image: Union[bytes, Image.Image]) -> bool:
    """
    Validate that data is a valid image.
    
    Args:
        image: Image data to validate
    
    Returns:
        True if valid image, False otherwise
    """
    try:
        if isinstance(image, bytes):
            img = Image.open(io.BytesIO(image))
        else:
            img = image
        
        # Try to load the image
        img.verify()
        return True
    except Exception as e:
        logger.debug(f"Image validation failed: {e}")
        return False
