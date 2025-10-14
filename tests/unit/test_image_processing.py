"""
Unit tests for image processing utilities.
"""
import pytest
import base64
from io import BytesIO
from PIL import Image

from src.utils.image_processing import (
    convert_to_buffer,
    image_to_base64,
    base64_to_image,
    resize_image,
    convert_image_format,
    get_image_info,
    create_thumbnail,
    validate_image,
)


@pytest.fixture
def sample_image_bytes():
    """Create a sample image as bytes."""
    img = Image.new('RGB', (100, 100), color='red')
    buffer = BytesIO()
    img.save(buffer, format='JPEG')
    return buffer.getvalue()


@pytest.fixture
def sample_image_base64(sample_image_bytes):
    """Create a sample image as base64 string."""
    return base64.b64encode(sample_image_bytes).decode('utf-8')


class TestConvertToBuffer:
    """Test convert_to_buffer function."""
    
    def test_convert_bytes(self, sample_image_bytes):
        """Test converting bytes returns same bytes."""
        result = convert_to_buffer(sample_image_bytes)
        assert result == sample_image_bytes
    
    def test_convert_base64_string(self, sample_image_base64, sample_image_bytes):
        """Test converting base64 string to bytes."""
        result = convert_to_buffer(sample_image_base64)
        assert isinstance(result, bytes)
        assert len(result) > 0
    
    def test_convert_data_uri(self, sample_image_base64):
        """Test converting data URI to bytes."""
        data_uri = f"data:image/jpeg;base64,{sample_image_base64}"
        result = convert_to_buffer(data_uri)
        assert isinstance(result, bytes)
        assert len(result) > 0
    
    def test_convert_pil_image(self):
        """Test converting PIL Image to bytes."""
        img = Image.new('RGB', (50, 50), color='blue')
        result = convert_to_buffer(img)
        assert isinstance(result, bytes)
        assert len(result) > 0


class TestImageToBase64:
    """Test image_to_base64 function."""
    
    def test_convert_bytes_to_base64(self, sample_image_bytes):
        """Test converting bytes to base64."""
        result = image_to_base64(sample_image_bytes)
        assert isinstance(result, str)
        assert len(result) > 0
        
        # Verify it's valid base64
        base64.b64decode(result)
    
    def test_convert_pil_image_to_base64(self):
        """Test converting PIL Image to base64."""
        img = Image.new('RGB', (50, 50), color='green')
        result = image_to_base64(img, format='JPEG')
        assert isinstance(result, str)
        assert len(result) > 0


class TestBase64ToImage:
    """Test base64_to_image function."""
    
    def test_convert_base64_to_image(self, sample_image_base64):
        """Test converting base64 to PIL Image."""
        img = base64_to_image(sample_image_base64)
        assert isinstance(img, Image.Image)
        assert img.size == (100, 100)
    
    def test_convert_data_uri_to_image(self, sample_image_base64):
        """Test converting data URI to PIL Image."""
        data_uri = f"data:image/jpeg;base64,{sample_image_base64}"
        img = base64_to_image(data_uri)
        assert isinstance(img, Image.Image)


class TestResizeImage:
    """Test resize_image function."""
    
    def test_resize_by_width(self, sample_image_bytes):
        """Test resizing by width."""
        resized = resize_image(sample_image_bytes, width=50)
        assert resized.width == 50
        assert resized.height == 50  # Aspect maintained
    
    def test_resize_by_height(self, sample_image_bytes):
        """Test resizing by height."""
        resized = resize_image(sample_image_bytes, height=75)
        assert resized.height == 75
        assert resized.width == 75  # Aspect maintained
    
    def test_resize_exact_size(self, sample_image_bytes):
        """Test exact resize without maintaining aspect."""
        resized = resize_image(
            sample_image_bytes,
            width=60,
            height=80,
            maintain_aspect=False
        )
        assert resized.width == 60
        assert resized.height == 80
    
    def test_resize_with_max_size(self, sample_image_bytes):
        """Test resizing with max_size parameter."""
        resized = resize_image(sample_image_bytes, max_size=50)
        assert max(resized.width, resized.height) <= 50


class TestConvertImageFormat:
    """Test convert_image_format function."""
    
    def test_convert_to_jpeg(self, sample_image_bytes):
        """Test converting to JPEG format."""
        result = convert_image_format(sample_image_bytes, format='JPEG')
        assert isinstance(result, bytes)
        
        # Verify it's a valid JPEG
        img = Image.open(BytesIO(result))
        assert img.format == 'JPEG'
    
    def test_convert_to_png(self, sample_image_bytes):
        """Test converting to PNG format."""
        result = convert_image_format(sample_image_bytes, format='PNG')
        assert isinstance(result, bytes)
        
        # Verify it's a valid PNG
        img = Image.open(BytesIO(result))
        assert img.format == 'PNG'
    
    def test_convert_rgba_to_jpeg(self):
        """Test converting RGBA image to JPEG."""
        # Create RGBA image
        img = Image.new('RGBA', (50, 50), color=(255, 0, 0, 128))
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        rgba_bytes = buffer.getvalue()
        
        # Convert to JPEG
        result = convert_image_format(rgba_bytes, format='JPEG')
        
        # Verify it's a valid JPEG
        img_result = Image.open(BytesIO(result))
        assert img_result.format == 'JPEG'
        assert img_result.mode == 'RGB'


class TestGetImageInfo:
    """Test get_image_info function."""
    
    def test_get_info_from_bytes(self, sample_image_bytes):
        """Test getting info from bytes."""
        info = get_image_info(sample_image_bytes)
        
        assert info['width'] == 100
        assert info['height'] == 100
        assert info['format'] == 'JPEG'
        assert info['size_bytes'] > 0
        assert info['size_kb'] > 0
        assert info['size_mb'] > 0
    
    def test_get_info_from_pil_image(self):
        """Test getting info from PIL Image."""
        img = Image.new('RGB', (200, 150), color='blue')
        info = get_image_info(img)
        
        assert info['width'] == 200
        assert info['height'] == 150


class TestCreateThumbnail:
    """Test create_thumbnail function."""
    
    def test_create_thumbnail_from_bytes(self, sample_image_bytes):
        """Test creating thumbnail from bytes."""
        thumbnail = create_thumbnail(sample_image_bytes, size=(50, 50))
        
        assert isinstance(thumbnail, bytes)
        
        # Verify thumbnail size
        img = Image.open(BytesIO(thumbnail))
        assert img.width <= 50
        assert img.height <= 50
    
    def test_create_thumbnail_from_pil_image(self):
        """Test creating thumbnail from PIL Image."""
        img = Image.new('RGB', (200, 200), color='green')
        thumbnail = create_thumbnail(img, size=(64, 64))
        
        assert isinstance(thumbnail, bytes)


class TestValidateImage:
    """Test validate_image function."""
    
    def test_validate_valid_image(self, sample_image_bytes):
        """Test validating a valid image."""
        assert validate_image(sample_image_bytes) is True
    
    def test_validate_invalid_image(self):
        """Test validating invalid data."""
        invalid_data = b"This is not an image"
        assert validate_image(invalid_data) is False
    
    def test_validate_pil_image(self):
        """Test validating PIL Image."""
        img = Image.new('RGB', (50, 50), color='red')
        assert validate_image(img) is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
