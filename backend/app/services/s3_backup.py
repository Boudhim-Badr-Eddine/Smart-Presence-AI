"""S3 backup service for photos and files."""
from datetime import datetime
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings
from app.core.logging_config import logger


class S3BackupService:
    """Service for backing up photos and files to S3."""
    
    def __init__(self):
        """Initialize S3 client if configured."""
        self.enabled = bool(
            settings.s3_bucket_name 
            and settings.aws_access_key_id 
            and settings.aws_secret_access_key
        )
        
        if self.enabled:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
                region_name=settings.aws_region or 'us-east-1',
            )
            self.bucket_name = settings.s3_bucket_name
        else:
            logger.warning("S3 backup is disabled (missing configuration)")
            self.s3_client = None
            self.bucket_name = None
    
    def upload_file(
        self, 
        file_content: bytes, 
        s3_key: str, 
        content_type: str = "image/jpeg",
        metadata: Optional[dict] = None
    ) -> Optional[str]:
        """
        Upload a file to S3.
        
        Args:
            file_content: File bytes to upload
            s3_key: S3 object key (path)
            content_type: MIME type
            metadata: Optional metadata dict
            
        Returns:
            S3 URL if successful, None otherwise
        """
        if not self.enabled:
            logger.warning(f"S3 upload skipped (disabled): {s3_key}")
            return None
        
        try:
            extra_args = {
                'ContentType': content_type,
            }
            if metadata:
                extra_args['Metadata'] = metadata
            
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=file_content,
                **extra_args
            )
            
            # Generate URL
            url = f"https://{self.bucket_name}.s3.amazonaws.com/{s3_key}"
            logger.info(f"Successfully uploaded to S3: {s3_key}")
            return url
            
        except ClientError as e:
            logger.error(f"S3 upload failed for {s3_key}: {e}")
            return None
    
    def download_file(self, s3_key: str) -> Optional[bytes]:
        """Download a file from S3."""
        if not self.enabled:
            return None
        
        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=s3_key)
            return response['Body'].read()
        except ClientError as e:
            logger.error(f"S3 download failed for {s3_key}: {e}")
            return None
    
    def delete_file(self, s3_key: str) -> bool:
        """Delete a file from S3."""
        if not self.enabled:
            return False
        
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            logger.info(f"Deleted from S3: {s3_key}")
            return True
        except ClientError as e:
            logger.error(f"S3 delete failed for {s3_key}: {e}")
            return False
    
    def backup_facial_photo(
        self, 
        user_id: int, 
        photo_content: bytes, 
        photo_type: str = "enrollment"
    ) -> Optional[str]:
        """
        Backup a facial recognition photo to S3.
        
        Args:
            user_id: User ID
            photo_content: Photo bytes
            photo_type: Type of photo (enrollment, verification, etc.)
            
        Returns:
            S3 URL if successful
        """
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        s3_key = f"faces/{user_id}/{photo_type}_{timestamp}.jpg"
        
        metadata = {
            'user_id': str(user_id),
            'photo_type': photo_type,
            'uploaded_at': datetime.utcnow().isoformat(),
        }
        
        return self.upload_file(
            file_content=photo_content,
            s3_key=s3_key,
            content_type="image/jpeg",
            metadata=metadata
        )
    
    def list_user_photos(self, user_id: int) -> list[str]:
        """List all S3 photos for a user."""
        if not self.enabled:
            return []
        
        try:
            prefix = f"faces/{user_id}/"
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )
            
            if 'Contents' in response:
                return [obj['Key'] for obj in response['Contents']]
            return []
            
        except ClientError as e:
            logger.error(f"S3 list failed for user {user_id}: {e}")
            return []


# Singleton instance
s3_backup_service = S3BackupService()
