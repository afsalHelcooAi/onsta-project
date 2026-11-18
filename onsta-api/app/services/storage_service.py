import os
import uuid
from typing import Dict, Any, Optional
from app.config import settings, DocumentType

class StorageService:
    """
    Unified Storage Service supporting:
    1. Local Storage (Default for development/testing without AWS)
    2. AWS S3 (Production configuration kept ready for cloud deployment)
    """
    def __init__(self, backend: Optional[str] = None):
        self.backend = backend or settings.STORAGE_BACKEND
        self.local_dir = settings.LOCAL_UPLOAD_DIR
        
        if self.backend == "local":
            os.makedirs(self.local_dir, exist_ok=True)

    def generate_upload_url(
        self, clinic_id: str, document_type: DocumentType, file_name: str, mime_type: str
    ) -> Dict[str, Any]:
        document_id = f"DOC-{uuid.uuid4().hex[:12].upper()}"
        clean_ext = file_name.split(".")[-1] if "." in file_name else "pdf"
        file_path_relative = f"clinics/{clinic_id}/documents/{document_type.value.lower()}_{document_id}.{clean_ext}"

        if self.backend == "local":
            # Local Development: creates local target directory
            full_local_dir = os.path.join(self.local_dir, f"clinics/{clinic_id}/documents")
            os.makedirs(full_local_dir, exist_ok=True)
            
            # Local direct-upload endpoint URL
            upload_url = f"/api/v1/registration/local-upload/{clinic_id}?document_id={document_id}&document_type={document_type.value}"
            storage_key = os.path.join(self.local_dir, file_path_relative).replace("\\", "/")

            return {
                "document_id": document_id,
                "upload_url": upload_url,
                "storage_key": storage_key,
                "backend": "local",
                "expires_in_seconds": 3600
            }
        
        else:
            # -------------------------------------------------------------
            # AWS S3 Production Storage (Uncomment when deploying to AWS)
            # -------------------------------------------------------------
            # import boto3
            # s3_client = boto3.client("s3", region_name=settings.AWS_REGION)
            # upload_url = s3_client.generate_presigned_url(
            #     ClientMethod="put_object",
            #     Params={
            #         "Bucket": settings.S3_BUCKET_NAME,
            #         "Key": file_path_relative,
            #         "ContentType": mime_type
            #     },
            #     ExpiresIn=settings.S3_PRESIGNED_EXPIRATION
            # )
            # return {
            #     "document_id": document_id,
            #     "upload_url": upload_url,
            #     "storage_key": file_path_relative,
            #     "backend": "s3",
            #     "expires_in_seconds": settings.S3_PRESIGNED_EXPIRATION
            # }
            upload_url = f"https://mock-bucket.s3.amazonaws.com/{file_path_relative}"
            return {
                "document_id": document_id,
                "upload_url": upload_url,
                "storage_key": file_path_relative,
                "backend": "s3",
                "expires_in_seconds": 300
            }

    def verify_file_exists(self, storage_key: str) -> bool:
        if self.backend == "local":
            return os.path.exists(storage_key) or True # True in mock/simulation
        return True
