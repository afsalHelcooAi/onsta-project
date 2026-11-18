import unittest
from app.config import ClinicStatus, DocumentType
from app.services.clinic_service import ClinicService
from app.services.storage_service import StorageService
from app.services.ai_gateway import AIGatewayService
from app.core.idempotency import IdempotencyManager
from app.schemas.registration import (
    PresignedUrlRequest,
    FastExtractRequest,
    SubmitRegistrationRequest
)
from app.schemas.ai_extraction import (
    ThreeDocumentExtractionOutput,
    TradeLicenseExtraction,
    FacilityLicenseExtraction,
    AdvertisingPermitExtraction,
    CrossValidationResult
)

class TestRegistrationAPI(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.service = ClinicService(
            storage_service=StorageService(backend="local"),
            ai_gateway=AIGatewayService(),
            idempotency_mgr=IdempotencyManager()
        )

    async def test_complete_onboarding_to_dashboard_access_flow(self):
        clinic_id = "clinic-test-001"

        # 1. Initially clinic is in DRAFT status, dashboard access is locked
        gate_init = self.service.check_dashboard_access(clinic_id)
        self.assertFalse(gate_init.access_granted)
        self.assertIn("locked", gate_init.lock_reason.lower())

        # 2. Upload Trade License (Local Storage)
        upload_trade = await self.service.get_upload_url(
            clinic_id,
            PresignedUrlRequest(
                file_name="trade-license.pdf",
                file_size_bytes=1024 * 1024,
                mime_type="application/pdf",
                document_type=DocumentType.TRADE_LICENSE
            )
        )
        self.assertIn("local-upload", upload_trade.upload_url)
        self.assertIn("DOC-", upload_trade.document_id)

        # Upload Facility License
        upload_fac = await self.service.get_upload_url(
            clinic_id,
            PresignedUrlRequest(
                file_name="dha-facility.pdf",
                file_size_bytes=2 * 1024 * 1024,
                mime_type="application/pdf",
                document_type=DocumentType.FACILITY_LICENSE
            )
        )

        # Upload MOHAP Permit
        upload_ad = await self.service.get_upload_url(
            clinic_id,
            PresignedUrlRequest(
                file_name="mohap-adv.pdf",
                file_size_bytes=500 * 1024,
                mime_type="application/pdf",
                document_type=DocumentType.MOHAP_ADVERTISING
            )
        )

        # 3. AI Fast Ingestion across the 3 uploaded documents
        extract_res = await self.service.fast_extract_3doc(
            FastExtractRequest(
                clinic_id=clinic_id,
                trade_license_doc_id=upload_trade.document_id,
                facility_license_doc_id=upload_fac.document_id,
                advertising_permit_doc_id=upload_ad.document_id
            ),
            idempotency_key="idemp-extract-001"
        )
        self.assertEqual(extract_res.status, ClinicStatus.READY_FOR_REVIEW)
        self.assertEqual(extract_res.extracted_data.trade_license.legal_name, "Al Noor Medical Clinic LLC")
        self.assertEqual(extract_res.extracted_data.facility_license.facility_license_number, "DHA-F-0012345")
        self.assertEqual(extract_res.prefilled_fields_count, 26)
        self.assertIsNotNone(extract_res.latency_ms) # Speed analyzed
        self.assertEqual(extract_res.storage_backend, "local")

        # Dashboard must still be locked while in READY_FOR_REVIEW
        gate_review = self.service.check_dashboard_access(clinic_id)
        self.assertFalse(gate_review.access_granted)

        # 4. Final Submission
        submit_res = await self.service.submit_registration(
            SubmitRegistrationRequest(
                clinic_id=clinic_id,
                contact_phone="+971501234567",
                company_email="admin@alnoorclinic.ae",
                declarations_accepted=True
            ),
            idempotency_key="idemp-submit-001"
        )
        self.assertEqual(submit_res.status, ClinicStatus.APPROVED)
        self.assertTrue(submit_res.dashboard_unlocked)

        # 5. Dashboard Gate: Access must now be GRANTED!
        gate_approved = self.service.check_dashboard_access(clinic_id)
        self.assertTrue(gate_approved.access_granted)
        self.assertEqual(gate_approved.dashboard_url, "/dashboard/overview")
        self.assertIsNone(gate_approved.lock_reason)

    async def test_idempotent_duplicate_submission(self):
        clinic_id = "clinic-idemp-002"
        
        # Prepare clinic in READY_FOR_REVIEW
        clinic = self.service.get_or_create_clinic(clinic_id)
        clinic.status = ClinicStatus.READY_FOR_REVIEW
        clinic.extracted_data = {"cross_validation": {"flags": []}}

        # First submit
        sub1 = await self.service.submit_registration(
            SubmitRegistrationRequest(
                clinic_id=clinic_id,
                contact_phone="+971509998888",
                company_email="test@clinic.ae"
            ),
            idempotency_key="unique-key-999"
        )
        self.assertEqual(sub1.status, ClinicStatus.APPROVED)

        # Second submit with identical key should return cached without error
        sub2 = await self.service.submit_registration(
            SubmitRegistrationRequest(
                clinic_id=clinic_id,
                contact_phone="+971509998888",
                company_email="test@clinic.ae"
            ),
            idempotency_key="unique-key-999"
        )
        self.assertEqual(sub2.status, ClinicStatus.APPROVED)
        self.assertEqual(sub2.message, sub1.message)

    async def test_mismatched_documents_stay_locked_in_under_review(self):
        clinic_id = "clinic-mismatch-003"
        clinic = self.service.get_or_create_clinic(clinic_id)
        clinic.status = ClinicStatus.READY_FOR_REVIEW
        # Has discrepancy flag
        clinic.extracted_data = {
            "cross_validation": {
                "flags": ["Mismatched Names: Apex Healthcare vs Sunshine Dental"]
            }
        }

        sub = await self.service.submit_registration(
            SubmitRegistrationRequest(
                clinic_id=clinic_id,
                contact_phone="+971501112222",
                company_email="mismatch@clinic.ae"
            )
        )
        # Should NOT be approved automatically; goes to UNDER_REVIEW
        self.assertEqual(sub.status, ClinicStatus.UNDER_REVIEW)
        self.assertFalse(sub.dashboard_unlocked)
        self.assertIsNotNone(sub.review_queue_id)

        # Dashboard gate must deny access
        gate = self.service.check_dashboard_access(clinic_id)
        self.assertFalse(gate.access_granted)
        self.assertIn("UNDER_REVIEW", gate.lock_reason)

if __name__ == "__main__":
    unittest.main()
