"""
Example usage of S3 and image processing utilities.
"""
import os
import sys
import logging

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.utils import (
    S3Client,
    upload_to_s3,
    download_from_s3,
    download_s3_to_base64,
    delete_from_s3,
    upload_style_training_images,
    upload_actor_training_images,
    image_to_base64,
    base64_to_image,
    resize_image,
    create_thumbnail,
    get_image_info,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


def example_basic_s3_operations():
    """Example: Basic S3 upload and download."""
    print("\n=== Example 1: Basic S3 Operations ===")
    
    # Create sample data
    sample_data = b"Hello, S3! This is test data."
    bucket = "storyboard-user-files"
    key = "test/sample.txt"
    
    try:
        # Upload
        print(f"Uploading to s3://{bucket}/{key}")
        result = upload_to_s3(
            file_data=sample_data,
            bucket=bucket,
            key=key,
            content_type="text/plain"
        )
        print(f"✅ Uploaded: {result['Location']}")
        
        # Download
        print(f"Downloading from s3://{bucket}/{key}")
        downloaded_data = download_from_s3(bucket, key)
        print(f"✅ Downloaded {len(downloaded_data)} bytes")
        print(f"Content: {downloaded_data.decode('utf-8')}")
        
        # Delete
        print(f"Deleting s3://{bucket}/{key}")
        delete_from_s3(bucket, key)
        print("✅ Deleted")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")


def example_image_upload():
    """Example: Upload an image to S3."""
    print("\n=== Example 2: Image Upload ===")
    
    # Create a simple test image (1x1 red pixel)
    from PIL import Image
    import io
    
    img = Image.new('RGB', (100, 100), color='red')
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    image_data = buffer.getvalue()
    
    bucket = "storyboard-user-files"
    key = "test/sample_image.jpg"
    
    try:
        client = S3Client()
        result = client.upload_image(
            image_data=image_data,
            bucket=bucket,
            key=key,
            extension="jpg"
        )
        print(f"✅ Image uploaded: {result['Location']}")
        
        # Clean up
        delete_from_s3(bucket, key)
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")


def example_download_to_base64():
    """Example: Download S3 file as base64."""
    print("\n=== Example 3: Download to Base64 ===")
    
    # First upload a small image
    from PIL import Image
    import io
    
    img = Image.new('RGB', (50, 50), color='blue')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    image_data = buffer.getvalue()
    
    bucket = "storyboard-user-files"
    key = "test/base64_test.png"
    
    try:
        # Upload
        upload_to_s3(image_data, bucket, key, content_type="image/png")
        print(f"✅ Uploaded image to s3://{bucket}/{key}")
        
        # Download as base64
        base64_data = download_s3_to_base64(bucket, key)
        print(f"✅ Downloaded as base64: {len(base64_data)} chars")
        print(f"Preview: {base64_data[:50]}...")
        
        # Clean up
        delete_from_s3(bucket, key)
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")


def example_training_data_upload():
    """Example: Upload training images for a style."""
    print("\n=== Example 4: Training Data Upload ===")
    
    from PIL import Image
    import io
    
    # Create sample training images
    training_images = []
    for i in range(3):
        img = Image.new('RGB', (256, 256), color=(i*50, 100, 200))
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG')
        training_images.append((buffer.getvalue(), f'training_{i}.jpg'))
    
    user_id = "test_user_123"
    style_id = "test_style_456"
    
    try:
        urls = upload_style_training_images(
            user_id=user_id,
            style_id=style_id,
            images=training_images
        )
        
        print(f"✅ Uploaded {len(urls)} training images:")
        for i, url in enumerate(urls, 1):
            print(f"  {i}. {url}")
        
        # Clean up (would need to delete each URL)
        # for url in urls:
        #     delete_s3_url(url)
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")


def example_image_processing():
    """Example: Image processing utilities."""
    print("\n=== Example 5: Image Processing ===")
    
    from PIL import Image
    import io
    
    # Create test image
    original = Image.new('RGB', (800, 600), color='green')
    buffer = io.BytesIO()
    original.save(buffer, format='JPEG')
    image_bytes = buffer.getvalue()
    
    # Get image info
    info = get_image_info(image_bytes)
    print(f"Image info:")
    print(f"  Size: {info['width']}x{info['height']}")
    print(f"  Format: {info['format']}")
    print(f"  Size: {info['size_kb']:.2f} KB")
    
    # Resize image
    resized = resize_image(image_bytes, width=400, height=300)
    print(f"✅ Resized to {resized.width}x{resized.height}")
    
    # Create thumbnail
    thumbnail = create_thumbnail(image_bytes, size=(128, 128))
    print(f"✅ Created thumbnail: {len(thumbnail)} bytes")
    
    # Convert to base64
    base64_str = image_to_base64(image_bytes)
    print(f"✅ Converted to base64: {len(base64_str)} chars")
    
    # Convert back from base64
    img_from_base64 = base64_to_image(base64_str)
    print(f"✅ Converted from base64: {img_from_base64.size}")


def example_s3_client_features():
    """Example: Advanced S3Client features."""
    print("\n=== Example 6: S3Client Advanced Features ===")
    
    try:
        client = S3Client()
        bucket = "storyboard-user-files"
        
        # List files in a bucket
        print(f"Listing files in bucket '{bucket}' with prefix 'test/':")
        files = client.list_files(bucket, prefix="test/", max_keys=5)
        
        if files:
            for file in files[:5]:
                print(f"  - {file['Key']} ({file['Size']} bytes)")
        else:
            print("  No files found")
        
        # Check if file exists
        test_key = "test/nonexistent.txt"
        exists = client.file_exists(bucket, test_key)
        print(f"\nFile '{test_key}' exists: {exists}")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")


def example_error_handling():
    """Example: Proper error handling."""
    print("\n=== Example 7: Error Handling ===")
    
    try:
        # Try to download non-existent file
        download_from_s3("storyboard-user-files", "nonexistent/file.txt")
    except Exception as e:
        print(f"✅ Caught expected error: {type(e).__name__}")
        print(f"   Message: {str(e)}")
    
    try:
        # Try with invalid credentials (if AWS_ACCESS_KEY not set)
        if not os.getenv("AWS_ACCESS_KEY"):
            client = S3Client()
    except ValueError as e:
        print(f"✅ Caught configuration error: {str(e)}")


if __name__ == "__main__":
    # Check environment variables
    if not os.getenv("AWS_ACCESS_KEY"):
        print("⚠️  Warning: AWS_ACCESS_KEY not set")
        print("   Set AWS credentials in .env to run S3 examples")
        print("   Only running image processing examples...\n")
        example_image_processing()
    else:
        print("✅ AWS credentials found\n")
        
        # Run all examples
        example_basic_s3_operations()
        example_image_upload()
        example_download_to_base64()
        example_training_data_upload()
        example_image_processing()
        example_s3_client_features()
        example_error_handling()
    
    print("\n✅ Examples completed")
