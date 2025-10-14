"""
S3 utilities specifically for training data uploads.
Based on backend s3-upload.util.ts patterns.
"""
import os
import re
import time
import base64
import logging
from typing import List, Optional, Union, BinaryIO
from datetime import datetime
from .s3 import S3Client, S3Config

logger = logging.getLogger(__name__)


class TrainingS3Uploader:
    """
    S3 uploader for training data files.
    
    Handles uploading training images and source images for LoRA training,
    with proper naming conventions and organization.
    """
    
    def __init__(self):
        """Initialize the training S3 uploader."""
        self.s3_client = S3Client()
        self.bucket = S3Config.AWS_USER_FILES_BUCKET
    
    @staticmethod
    def _sanitize_id(id_str: str, prefix: str = "item") -> str:
        """
        Sanitize an ID for use in filenames.
        
        Args:
            id_str: ID string to sanitize
            prefix: Prefix to use if ID is empty
        
        Returns:
            Sanitized ID string
        """
        # Remove non-alphanumeric characters and convert to lowercase
        sanitized = re.sub(r'[^a-z0-9]', '', id_str.lower())
        
        # Take first 8 characters or use prefix
        return sanitized[:8] if sanitized else prefix
    
    @staticmethod
    def _get_file_extension(filename: str) -> str:
        """
        Extract file extension from filename.
        
        Args:
            filename: Original filename
        
        Returns:
            File extension (lowercase, without dot)
        """
        if '.' in filename:
            return filename.split('.')[-1].lower()
        return 'jpg'
    
    def upload_training_file(
        self,
        user_id: str,
        item_id: str,
        file_data: Union[bytes, BinaryIO],
        original_filename: str = "image.jpg",
        subfolder: str = "training_data",
        item_type: str = "style",
        index: Optional[int] = None
    ) -> str:
        """
        Upload a single training file to S3.
        
        Args:
            user_id: User ID
            item_id: Style or actor ID
            file_data: File data as bytes or file-like object
            original_filename: Original filename
            subfolder: Subfolder ('training_data' or 'source_image')
            item_type: Type of item ('style' or 'actor')
            index: Optional index for training data files
        
        Returns:
            S3 URL of uploaded file
        """
        # Sanitize IDs
        id_prefix = self._sanitize_id(item_id, item_type)
        
        # Build filename
        timestamp = int(time.time() * 1000)  # Milliseconds
        ext = self._get_file_extension(original_filename)
        
        if subfolder == "source_image":
            # Source image: {type}_{id}_source_{timestamp}.{ext}
            filename = f"{item_type}_{id_prefix}_source_{timestamp}.{ext}"
        else:
            # Training data: {type}_{id}_td_{timestamp}_{index}.{ext}
            index_str = str(index or 1).zfill(2)
            filename = f"{item_type}_{id_prefix}_td_{timestamp}_{index_str}.{ext}"
        
        # Build S3 key
        s3_key = f"{user_id}/custom_{item_type}/{subfolder}/{item_id}/{filename}"
        
        logger.info(f"Uploading training file: {s3_key}")
        
        # Upload to S3
        result = self.s3_client.upload_image(
            image_data=file_data,
            bucket=self.bucket,
            key=s3_key,
            extension=ext
        )
        
        return result['Location']
    
    def upload_multiple_training_files(
        self,
        user_id: str,
        item_id: str,
        files: List[Union[bytes, tuple]],
        item_type: str = "style"
    ) -> List[str]:
        """
        Upload multiple training files to S3.
        
        Args:
            user_id: User ID
            item_id: Style or actor ID
            files: List of file data (bytes) or tuples of (bytes, filename)
            item_type: Type of item ('style' or 'actor')
        
        Returns:
            List of S3 URLs for uploaded files
        """
        urls = []
        
        for i, file_item in enumerate(files, start=1):
            # Handle both bytes and (bytes, filename) tuples
            if isinstance(file_item, tuple):
                file_data, filename = file_item
            else:
                file_data = file_item
                filename = f"image_{i}.jpg"
            
            # Upload with small delay to avoid key collisions
            url = self.upload_training_file(
                user_id=user_id,
                item_id=item_id,
                file_data=file_data,
                original_filename=filename,
                subfolder="training_data",
                item_type=item_type,
                index=i
            )
            
            urls.append(url)
            
            # Small jittered delay (50-100ms)
            time.sleep(0.05 + 0.05 * (i % 2))
        
        logger.info(f"Successfully uploaded {len(urls)} training files")
        return urls
    
    def upload_source_image(
        self,
        user_id: str,
        item_id: str,
        image_data: Union[bytes, BinaryIO],
        original_filename: str = "source.jpg",
        item_type: str = "style"
    ) -> str:
        """
        Upload a source image for training.
        
        Args:
            user_id: User ID
            item_id: Style or actor ID
            image_data: Image data as bytes or file-like object
            original_filename: Original filename
            item_type: Type of item ('style' or 'actor')
        
        Returns:
            S3 URL of uploaded image
        """
        return self.upload_training_file(
            user_id=user_id,
            item_id=item_id,
            file_data=image_data,
            original_filename=original_filename,
            subfolder="source_image",
            item_type=item_type
        )
    
    def upload_style_training_data(
        self,
        user_id: str,
        style_id: str,
        training_images: List[Union[bytes, tuple]]
    ) -> List[str]:
        """
        Upload training data for a custom style.
        
        Args:
            user_id: User ID
            style_id: Style ID
            training_images: List of training images
        
        Returns:
            List of S3 URLs
        """
        return self.upload_multiple_training_files(
            user_id=user_id,
            item_id=style_id,
            files=training_images,
            item_type="style"
        )
    
    def upload_actor_training_data(
        self,
        user_id: str,
        actor_id: str,
        training_images: List[Union[bytes, tuple]]
    ) -> List[str]:
        """
        Upload training data for a custom actor.
        
        Args:
            user_id: User ID
            actor_id: Actor ID
            training_images: List of training images
        
        Returns:
            List of S3 URLs
        """
        return self.upload_multiple_training_files(
            user_id=user_id,
            item_id=actor_id,
            files=training_images,
            item_type="actor"
        )


# Convenience functions

def upload_training_file(
    user_id: str,
    item_id: str,
    file_data: Union[bytes, BinaryIO],
    original_filename: str = "image.jpg",
    item_type: str = "style",
    **kwargs
) -> str:
    """
    Upload a single training file using default configuration.
    
    Args:
        user_id: User ID
        item_id: Style or actor ID
        file_data: File data
        original_filename: Original filename
        item_type: Type ('style' or 'actor')
        **kwargs: Additional arguments
    
    Returns:
        S3 URL of uploaded file
    """
    uploader = TrainingS3Uploader()
    return uploader.upload_training_file(
        user_id, item_id, file_data, original_filename, item_type=item_type, **kwargs
    )


def upload_style_training_images(
    user_id: str,
    style_id: str,
    images: List[Union[bytes, tuple]]
) -> List[str]:
    """
    Upload multiple training images for a style.
    
    Args:
        user_id: User ID
        style_id: Style ID
        images: List of image data
    
    Returns:
        List of S3 URLs
    """
    uploader = TrainingS3Uploader()
    return uploader.upload_style_training_data(user_id, style_id, images)


def upload_actor_training_images(
    user_id: str,
    actor_id: str,
    images: List[Union[bytes, tuple]]
) -> List[str]:
    """
    Upload multiple training images for an actor.
    
    Args:
        user_id: User ID
        actor_id: Actor ID
        images: List of image data
    
    Returns:
        List of S3 URLs
    """
    uploader = TrainingS3Uploader()
    return uploader.upload_actor_training_data(user_id, actor_id, images)
