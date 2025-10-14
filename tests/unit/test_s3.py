"""
Unit tests for S3 utilities.
"""
import pytest
import os
from unittest.mock import Mock, patch, MagicMock
from io import BytesIO

# Mock boto3 before importing our modules
with patch('boto3.client'):
    from src.utils.s3 import S3Client, S3Config


class TestS3Config:
    """Test S3Config class."""
    
    def test_config_reads_env_vars(self, monkeypatch):
        """Test that config reads from environment variables."""
        monkeypatch.setenv("AWS_ACCESS_KEY", "test_key")
        monkeypatch.setenv("AWS_ACCESS_SECRET", "test_secret")
        monkeypatch.setenv("AWS_REGION", "us-west-2")
        
        # Reload config
        from importlib import reload
        import src.utils.s3
        reload(src.utils.s3)
        
        assert os.getenv("AWS_ACCESS_KEY") == "test_key"
        assert os.getenv("AWS_ACCESS_SECRET") == "test_secret"
        assert os.getenv("AWS_REGION") == "us-west-2"
    
    def test_validate_requires_credentials(self, monkeypatch):
        """Test that validate raises error without credentials."""
        monkeypatch.delenv("AWS_ACCESS_KEY", raising=False)
        
        with pytest.raises(ValueError, match="AWS_ACCESS_KEY"):
            S3Config.validate()


class TestS3Client:
    """Test S3Client class."""
    
    @patch('boto3.client')
    def test_client_initialization(self, mock_boto_client):
        """Test S3Client initialization."""
        client = S3Client(
            access_key="test_key",
            secret_key="test_secret",
            region="us-east-1"
        )
        
        assert client.access_key == "test_key"
        assert client.secret_key == "test_secret"
        assert client.region == "us-east-1"
        
        mock_boto_client.assert_called_once_with(
            's3',
            aws_access_key_id="test_key",
            aws_secret_access_key="test_secret",
            region_name="us-east-1"
        )
    
    @patch('boto3.client')
    def test_upload_file(self, mock_boto_client):
        """Test file upload."""
        mock_s3 = Mock()
        mock_s3.put_object.return_value = {'ETag': '"abc123"'}
        mock_boto_client.return_value = mock_s3
        
        client = S3Client(
            access_key="test_key",
            secret_key="test_secret"
        )
        
        result = client.upload_file(
            file_data=b"test data",
            bucket="test-bucket",
            key="test/file.txt",
            content_type="text/plain"
        )
        
        assert result['Bucket'] == "test-bucket"
        assert result['Key'] == "test/file.txt"
        assert 'Location' in result
        
        mock_s3.put_object.assert_called_once()
    
    @patch('boto3.client')
    def test_download_file(self, mock_boto_client):
        """Test file download."""
        mock_s3 = Mock()
        mock_body = Mock()
        mock_body.read.return_value = b"downloaded data"
        mock_s3.get_object.return_value = {'Body': mock_body}
        mock_boto_client.return_value = mock_s3
        
        client = S3Client(
            access_key="test_key",
            secret_key="test_secret"
        )
        
        data = client.download_file("test-bucket", "test/file.txt")
        
        assert data == b"downloaded data"
        mock_s3.get_object.assert_called_once_with(
            Bucket="test-bucket",
            Key="test/file.txt"
        )
    
    @patch('boto3.client')
    def test_delete_file(self, mock_boto_client):
        """Test file deletion."""
        mock_s3 = Mock()
        mock_boto_client.return_value = mock_s3
        
        client = S3Client(
            access_key="test_key",
            secret_key="test_secret"
        )
        
        client.delete_file("test-bucket", "test/file.txt")
        
        mock_s3.delete_object.assert_called_once_with(
            Bucket="test-bucket",
            Key="test/file.txt"
        )
    
    @patch('boto3.client')
    def test_delete_file_by_url(self, mock_boto_client):
        """Test deleting file by URL."""
        mock_s3 = Mock()
        mock_boto_client.return_value = mock_s3
        
        client = S3Client(
            access_key="test_key",
            secret_key="test_secret"
        )
        
        url = "https://test-bucket.s3.us-west-1.amazonaws.com/path/to/file.jpg"
        client.delete_file_by_url(url)
        
        mock_s3.delete_object.assert_called_once_with(
            Bucket="test-bucket",
            Key="path/to/file.jpg"
        )
    
    @patch('boto3.client')
    def test_file_exists(self, mock_boto_client):
        """Test file existence check."""
        mock_s3 = Mock()
        mock_boto_client.return_value = mock_s3
        
        client = S3Client(
            access_key="test_key",
            secret_key="test_secret"
        )
        
        # File exists
        mock_s3.head_object.return_value = {}
        assert client.file_exists("test-bucket", "existing.txt") is True
        
        # File doesn't exist
        from botocore.exceptions import ClientError
        mock_s3.head_object.side_effect = ClientError(
            {'Error': {'Code': '404'}}, 'HeadObject'
        )
        assert client.file_exists("test-bucket", "missing.txt") is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
