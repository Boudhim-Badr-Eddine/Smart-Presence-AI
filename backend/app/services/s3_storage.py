"""
S3 Storage Service - Redundant photo storage with backup
Supports AWS S3, MinIO, or any S3-compatible storage
"""

import os
from typing import BinaryIO, Optional

import boto3
from botocore.exceptions import ClientError

from app.core.config import get_settings

settings = get_settings()


class S3StorageService:
    """Service for storing photos in S3-compatible storage."""
    
    def __init__(self):
        self.enabled = getattr(settings, 'S3_ENABLED', False)
        
        if self.enabled:
            self.s3_client = boto3.client(
                's3',
                endpoint_url=getattr(settings, 'S3_ENDPOINT_URL', None),
                aws_access_key_id=getattr(settings, 'S3_ACCESS_KEY', None),
                aws_secret_access_key=getattr(settings, 'S3_SECRET_KEY', None),
                region_name=getattr(settings, 'S3_REGION', 'us-east-1'),
            )
            self.bucket_name = getattr(settings, 'S3_BUCKET_NAME', 'smartpresence-photos')
    
    def upload_photo(
        self,
        file_obj: BinaryIO,
        object_key: str,
        metadata: Optional[dict] = None,
    ) -> Optional[str]:
        """
        Upload a photo to S3.
        Returns the S3 URL if successful, None otherwise.
        """
        if not self.enabled:
            return None
        
        try:
            extra_args = {}
            if metadata:
                extra_args['Metadata'] = metadata
            
            self.s3_client.upload_fileobj(
                file_obj,
                self.bucket_name,
                object_key,
                ExtraArgs=extra_args,
            )
            
            # Generate URL
            url = f"s3://{self.bucket_name}/{object_key}"
            return url
            
        except ClientError as e:
            print(f"Error uploading to S3: {e}")
            return None
    
    def download_photo(self, object_key: str) -> Optional[bytes]:
        """Download a photo from S3."""
        if not self.enabled:
            return None
        
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=object_key,
            )
            return response['Body'].read()
        except ClientError as e:
            print(f"Error downloading from S3: {e}")
            return None
    
    def delete_photo(self, object_key: str) -> bool:
        """Delete a photo from S3."""
        if not self.enabled:
            return False
        
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=object_key,
            )
            return True
        except ClientError as e:
            print(f"Error deleting from S3: {e}")
            return False
    
    def generate_presigned_url(
        self,
        object_key: str,
        expiration: int = 3600,
    ) -> Optional[str]:
        """Generate a presigned URL for temporary access."""
        if not self.enabled:
            return None
        
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': object_key,
                },
                ExpiresIn=expiration,
            )
            return url
        except ClientError as e:
            print(f"Error generating presigned URL: {e}")
            return None
    
    def backup_local_to_s3(self, local_path: str, s3_key: str) -> bool:
        """Backup a local file to S3."""
        if not self.enabled or not os.path.exists(local_path):
            return False
        
        try:
            with open(local_path, 'rb') as f:
                return self.upload_photo(f, s3_key) is not None
        except Exception as e:
            print(f"Error backing up to S3: {e}")
            return False


# Global instance
_s3_service = None


def get_s3_service() -> S3StorageService:
    """Get singleton S3 service instance."""
    global _s3_service
    if _s3_service is None:
        _s3_service = S3StorageService()
    return _s3_service
