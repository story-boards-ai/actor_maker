"""
AWS S3 utilities for file upload and download.
Based on backend S3 implementation patterns.
"""
import os
import io
import base64
import logging
from typing import Optional, List, Dict, Any, Union, BinaryIO
from datetime import datetime
from urllib.parse import urlparse

try:
    import boto3
    from botocore.exceptions import ClientError, BotoCoreError
except ImportError:
    raise ImportError(
        "boto3 is required for S3 functionality. "
        "Install it with: pip install boto3"
    )

logger = logging.getLogger(__name__)


class S3Config:
    """S3 configuration from environment variables."""
    
    AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
    AWS_ACCESS_SECRET = os.getenv("AWS_ACCESS_SECRET")
    AWS_REGION = os.getenv("AWS_REGION", "us-west-1")
    
    # Bucket names
    AWS_USER_FILES_BUCKET = os.getenv("AWS_USER_FILES_BUCKET", "storyboard-user-files")
    AWS_USER_IMAGES_BUCKET = os.getenv("AWS_USER_IMAGES_BUCKET")
    AWS_OUTFIT_BUCKET = os.getenv("AWS_OUTFIT_BUCKET")
    
    @classmethod
    def validate(cls) -> None:
        """Validate required S3 credentials are set."""
        if not cls.AWS_ACCESS_KEY:
            raise ValueError("AWS_ACCESS_KEY environment variable is required")
        if not cls.AWS_ACCESS_SECRET:
            raise ValueError("AWS_ACCESS_SECRET environment variable is required")


class S3Client:
    """
    AWS S3 client wrapper for file operations.
    
    Provides methods for uploading, downloading, and deleting files from S3.
    """
    
    def __init__(
        self,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        region: Optional[str] = None
    ):
        """
        Initialize S3 client.
        
        Args:
            access_key: AWS access key (uses AWS_ACCESS_KEY env var if not provided)
            secret_key: AWS secret key (uses AWS_ACCESS_SECRET env var if not provided)
            region: AWS region (uses AWS_REGION env var if not provided)
        """
        self.access_key = access_key or S3Config.AWS_ACCESS_KEY
        self.secret_key = secret_key or S3Config.AWS_ACCESS_SECRET
        self.region = region or S3Config.AWS_REGION
        
        if not self.access_key or not self.secret_key:
            raise ValueError(
                "AWS credentials are required. Set AWS_ACCESS_KEY and AWS_ACCESS_SECRET "
                "environment variables or pass them to the constructor."
            )
        
        self.s3 = boto3.client(
            's3',
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region
        )
        
        logger.debug("AWS S3 client initialized successfully")
    
    def upload_file(
        self,
        file_data: Union[bytes, BinaryIO],
        bucket: str,
        key: str,
        content_type: str = "application/octet-stream",
        content_disposition: str = "inline",
        metadata: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Upload a file to S3.
        
        Args:
            file_data: File data as bytes or file-like object
            bucket: S3 bucket name
            key: S3 object key (path)
            content_type: MIME type of the file
            content_disposition: Content disposition header
            metadata: Optional metadata dict
        
        Returns:
            Dict with upload information including Location, Bucket, Key, ETag
            
        Raises:
            ClientError: If upload fails
        """
        logger.info(f"Uploading to S3: bucket={bucket}, key={key}")
        
        try:
            # Prepare upload parameters
            upload_params = {
                'Bucket': bucket,
                'Key': key,
                'Body': file_data,
                'ContentType': content_type,
                'ContentDisposition': content_disposition,
            }
            
            if metadata:
                upload_params['Metadata'] = metadata
            
            # Upload file
            response = self.s3.put_object(**upload_params)
            
            # Construct result similar to backend
            result = {
                'Location': f"https://{bucket}.s3.{self.region}.amazonaws.com/{key}",
                'Bucket': bucket,
                'Key': key,
                'ETag': response.get('ETag', '').strip('"'),
            }
            
            logger.info(f"Successfully uploaded to S3: {result['Location']}")
            return result
            
        except (ClientError, BotoCoreError) as e:
            logger.error(f"Error uploading to S3: {str(e)}")
            raise
    
    def upload_image(
        self,
        image_data: Union[bytes, BinaryIO],
        bucket: str,
        key: str,
        extension: str = "jpg"
    ) -> Dict[str, Any]:
        """
        Upload an image file to S3 with appropriate content type.
        
        Args:
            image_data: Image data as bytes or file-like object
            bucket: S3 bucket name
            key: S3 object key (path)
            extension: Image extension (jpg, jpeg, png, webp)
        
        Returns:
            Dict with upload information
        """
        # Determine content type
        content_type_map = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'webp': 'image/webp',
            'gif': 'image/gif',
        }
        
        content_type = content_type_map.get(
            extension.lower(),
            'application/octet-stream'
        )
        
        return self.upload_file(
            file_data=image_data,
            bucket=bucket,
            key=key,
            content_type=content_type
        )
    
    def download_file(
        self,
        bucket: str,
        key: str
    ) -> bytes:
        """
        Download a file from S3.
        
        Args:
            bucket: S3 bucket name
            key: S3 object key (path)
        
        Returns:
            File data as bytes
            
        Raises:
            ClientError: If download fails
        """
        logger.info(f"Downloading from S3: bucket={bucket}, key={key}")
        
        try:
            response = self.s3.get_object(Bucket=bucket, Key=key)
            
            # Read body data
            body = response['Body'].read()
            
            logger.info(f"Successfully downloaded from S3: {len(body)} bytes")
            return body
            
        except (ClientError, BotoCoreError) as e:
            logger.error(f"Error downloading from S3: {str(e)}")
            raise
    
    def download_file_to_base64(
        self,
        bucket: str,
        key: str
    ) -> str:
        """
        Download a file from S3 and return as base64 string.
        
        Args:
            bucket: S3 bucket name
            key: S3 object key (path)
        
        Returns:
            Base64 encoded string
        """
        file_data = self.download_file(bucket, key)
        base64_data = base64.b64encode(file_data).decode('utf-8')
        
        logger.debug(f"Converted S3 object to base64: {len(base64_data)} chars")
        return base64_data
    
    def delete_file(
        self,
        bucket: str,
        key: str
    ) -> None:
        """
        Delete a file from S3.
        
        Args:
            bucket: S3 bucket name
            key: S3 object key (path)
            
        Raises:
            ClientError: If deletion fails
        """
        logger.info(f"Deleting from S3: bucket={bucket}, key={key}")
        
        try:
            self.s3.delete_object(Bucket=bucket, Key=key)
            logger.info(f"Successfully deleted from S3: {key}")
            
        except (ClientError, BotoCoreError) as e:
            logger.error(f"Error deleting from S3: {str(e)}")
            raise
    
    def delete_file_by_url(self, file_url: str) -> None:
        """
        Delete a file from S3 using its full URL.
        
        Parses the URL to extract bucket and key, then deletes the file.
        
        Args:
            file_url: Full S3 URL (e.g., https://bucket.s3.region.amazonaws.com/path/file.jpg)
            
        Raises:
            ValueError: If URL cannot be parsed
            ClientError: If deletion fails
        """
        try:
            parsed = urlparse(file_url)
            
            # Extract bucket from hostname (e.g., "bucket.s3.region.amazonaws.com")
            hostname_parts = parsed.hostname.split('.')
            bucket = hostname_parts[0]
            
            # Extract key from path (remove leading slash)
            key = parsed.path.lstrip('/')
            
            logger.debug(f"Parsed URL - bucket: {bucket}, key: {key}")
            
            self.delete_file(bucket, key)
            
        except Exception as e:
            logger.error(f"Error parsing S3 URL: {file_url}")
            raise ValueError(f"Invalid S3 URL: {file_url}") from e
    
    def list_files(
        self,
        bucket: str,
        prefix: str = "",
        max_keys: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        List files in an S3 bucket with optional prefix filter.
        
        Args:
            bucket: S3 bucket name
            prefix: Optional prefix to filter results
            max_keys: Maximum number of keys to return
        
        Returns:
            List of dicts with file information (Key, Size, LastModified, etc.)
        """
        logger.info(f"Listing S3 files: bucket={bucket}, prefix={prefix}")
        
        try:
            response = self.s3.list_objects_v2(
                Bucket=bucket,
                Prefix=prefix,
                MaxKeys=max_keys
            )
            
            files = response.get('Contents', [])
            logger.info(f"Found {len(files)} files")
            
            return files
            
        except (ClientError, BotoCoreError) as e:
            logger.error(f"Error listing S3 files: {str(e)}")
            raise
    
    def file_exists(
        self,
        bucket: str,
        key: str
    ) -> bool:
        """
        Check if a file exists in S3.
        
        Args:
            bucket: S3 bucket name
            key: S3 object key (path)
        
        Returns:
            True if file exists, False otherwise
        """
        try:
            self.s3.head_object(Bucket=bucket, Key=key)
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return False
            # Re-raise other errors
            raise


# Convenience functions

def upload_to_s3(
    file_data: Union[bytes, BinaryIO],
    bucket: str,
    key: str,
    content_type: str = "application/octet-stream",
    **kwargs
) -> Dict[str, Any]:
    """
    Upload a file to S3 using default credentials.
    
    Args:
        file_data: File data as bytes or file-like object
        bucket: S3 bucket name
        key: S3 object key (path)
        content_type: MIME type
        **kwargs: Additional arguments passed to S3Client.upload_file
    
    Returns:
        Dict with upload information
    """
    client = S3Client()
    return client.upload_file(file_data, bucket, key, content_type, **kwargs)


def download_from_s3(bucket: str, key: str) -> bytes:
    """
    Download a file from S3 using default credentials.
    
    Args:
        bucket: S3 bucket name
        key: S3 object key (path)
    
    Returns:
        File data as bytes
    """
    client = S3Client()
    return client.download_file(bucket, key)


def download_s3_to_base64(bucket: str, key: str) -> str:
    """
    Download a file from S3 and return as base64 string.
    
    Args:
        bucket: S3 bucket name
        key: S3 object key (path)
    
    Returns:
        Base64 encoded string
    """
    client = S3Client()
    return client.download_file_to_base64(bucket, key)


def delete_from_s3(bucket: str, key: str) -> None:
    """
    Delete a file from S3 using default credentials.
    
    Args:
        bucket: S3 bucket name
        key: S3 object key (path)
    """
    client = S3Client()
    client.delete_file(bucket, key)


def delete_s3_url(file_url: str) -> None:
    """
    Delete a file from S3 using its full URL.
    
    Args:
        file_url: Full S3 URL
    """
    client = S3Client()
    client.delete_file_by_url(file_url)
