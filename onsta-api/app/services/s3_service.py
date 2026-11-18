import uuid
from typing import Dict, Any
from app.config import settings, DocumentType

class S3Service:
    """
    AWS S3 Storage Service handling direct presigned upload URLs.
    Enforces that large PDF files are uploaded directly from client browser to S3,
    bypassing the application server to minimize latency.
    """
    def __init__(self, s3_client=None):
        self.client = s3_client
        self.bucket = settings.S3_BUCKET_NAME

    def generate_presigned_upload_url(
        self, clinic_id: str, document_type: DocumentType, file_name: str, mime_type: str
    ) -> Dict[str, Any]:
        document_id = f"DOC-{uuid.uuid4().hex[:12].upper()}"
        clean_ext = file_name.split(".")[-1] if "." in file_name else "pdf"
        s3_key = f"clinics/{clinic_id}/documents/{document_type.value.lower()}_{document_id}.{clean_ext}"

        if self.client:
            upload_url = self.client.generate_presigned_url(
                ClientMethod="put_object",
                Params={
                    "Bucket": self.bucket,
                    "Key": s3_key,
                    "ContentType": mime_type
                },
                ExpiresIn=settings.S3_PRESIGNED_EXPIRATION
            )
        else:
            # Mock S3 Presigned URL for development/testing
            upload_url = f"https://{self.bucket}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}?AWSAccessKeyId=MOCK&Signature=MOCK&Expires={settings.S3_PRESIGNED_EXPIRATION}"

        return {
            "document_id": document_id,
            "upload_url": upload_url,
            "s3_key": s3_key,
            "expires_in_seconds": settings.S3_PRESIGNED_EXPIRATION
        }

    def verify_file_exists(self, s3_key: str) -> bool:
        """Verifies that the client actually uploaded the file to S3."""
        if self.client:
            try:
                self.client.head_object(Bucket=self.bucket, Key=s3_key)
                return True
            except Exception:
                return False
        return True # Default to True in mock mode
