import unittest
import uuid
from datetime import date, timedelta
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.db.database import SessionLocal, engine
from sqlalchemy import text
from app.core.security import create_access_token


class TestClinicComplianceE2E(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.transport = ASGITransport(app=app)
        async with SessionLocal() as s:
            user = (await s.execute(text("""
                SELECT u.id::text, u.email
                FROM users u
                JOIN clinic_applications a ON a.submitted_by_user_id = u.id
                WHERE a.application_status = 'APPROVED'
                LIMIT 1
            """))).mappings().first()
            if not user:
                user = (await s.execute(text("SELECT id::text, email FROM users LIMIT 1"))).mappings().first()

            self.user_id = user["id"]
            self.user_email = user["email"]

        self.token = create_access_token(self.user_id)
        self.headers = {"Authorization": f"Bearer {self.token}"}

    async def asyncTearDown(self):
        try:
            async with SessionLocal() as s:
                await s.execute(text("DELETE FROM compliance_renewal_requests WHERE target_name = 'Dr. Compliance Test' OR document_number = 'DHA-RN-778899'"))
                await s.execute(text("DELETE FROM practitioner_licenses WHERE license_number = 'DHA-TEST-COMP-001'"))
                await s.execute(text("DELETE FROM practitioners WHERE full_name = 'Dr. Compliance Test'"))
                await s.commit()
        except Exception:
            pass
        await engine.dispose()

    async def test_compliance_lifecycle(self):
        async with AsyncClient(transport=self.transport, base_url="http://test") as ac:
            # 1. Test GET /api/v1/clinic/compliance
            res = await ac.get("/api/v1/clinic/compliance", headers=self.headers)
            self.assertEqual(res.status_code, 200, res.text)
            data = res.json()
            self.assertEqual(data["status"], "success")
            self.assertIn("overallScore", data)
            self.assertIn("publicListingActive", data)
            self.assertIn("credentials", data)
            self.assertGreaterEqual(len(data["credentials"]), 4)

            # Check core documents exist
            doc_codes = [c["code"] for c in data["credentials"]]
            self.assertIn("FACILITY_LICENSE", doc_codes)
            self.assertIn("TRADE_LICENSE", doc_codes)
            self.assertIn("MOHAP_ADVERTISING", doc_codes)
            self.assertIn("AUTHORIZED_REP_ID", doc_codes)

            # Check 12 Rules Evaluation
            self.assertIn("rulesEvaluation", data)
            rule_ids = [r["id"] for r in data["rulesEvaluation"]]
            expected_rules = [f"V{i:02d}" for i in range(1, 13)]
            for r_id in expected_rules:
                self.assertIn(r_id, rule_ids)

            self.assertEqual(data["rulesSummary"]["total"], 12)

            # 2. Test POST /api/v1/clinic/compliance/renew (Submits for approval)
            renew_date = (date.today() + timedelta(days=730)).strftime("%Y-%m-%d")
            res_renew = await ac.post(
                "/api/v1/clinic/compliance/renew",
                data={
                    "document_code": "FACILITY_LICENSE",
                    "new_expiry_date": renew_date,
                    "document_number": "DHA-F-9998887"
                },
                headers=self.headers
            )
            self.assertEqual(res_renew.status_code, 200, res_renew.text)
            renew_data = res_renew.json()
            self.assertEqual(renew_data["status"], "pending_approval")
            self.assertEqual(renew_data["documentCode"], "FACILITY_LICENSE")
            self.assertEqual(renew_data["newExpiryDate"], renew_date)
            req_id = renew_data["requestId"]

            # 3. Check that clinic compliance immediately reflects PENDING_REVIEW
            res_pending = await ac.get("/api/v1/clinic/compliance", headers=self.headers)
            self.assertEqual(res_pending.status_code, 200)
            pending_fac = next(c for c in res_pending.json()["credentials"] if c["code"] == "FACILITY_LICENSE")
            self.assertEqual(pending_fac["status"], "PENDING_REVIEW")

            # 4. Super Admin Approves the renewal request
            async with SessionLocal() as s:
                admin = (await s.execute(text("""
                    SELECT u.id::text FROM users u
                    JOIN user_roles ur ON ur.user_id = u.id
                    JOIN roles r ON r.id = ur.role_id
                    WHERE r.name = 'SUPER_ADMIN' AND r.scope = 'PLATFORM'
                    LIMIT 1
                """))).mappings().first()
            self.assertIsNotNone(admin)
            admin_headers = {"Authorization": f"Bearer {create_access_token(admin['id'])}"}

            res_approve = await ac.post(
                f"/api/v1/platform-admin/compliance/renewals/{req_id}/approve",
                headers=admin_headers,
                json={"reason": "Approved in E2E compliance test"}
            )
            self.assertEqual(res_approve.status_code, 200)
            self.assertEqual(res_approve.json()["status"], "APPROVED")

            # 5. Check that clinic compliance now reflects the approved live state
            res_after = await ac.get("/api/v1/clinic/compliance", headers=self.headers)
            self.assertEqual(res_after.status_code, 200)
            fac_cred = next(c for c in res_after.json()["credentials"] if c["code"] == "FACILITY_LICENSE")
            self.assertEqual(fac_cred["expiryDate"], renew_date)
            self.assertGreater(fac_cred["daysRemaining"], 700)

    async def test_doctor_license_renewal_rejection_and_approval_flow(self):
        async with AsyncClient(transport=self.transport, base_url="http://test") as ac:
            # 1. Fetch compliance watchdog or create a test doctor if none exists
            comp_res = await ac.get("/api/v1/clinic/compliance", headers=self.headers)
            self.assertEqual(comp_res.status_code, 200)
            watchdog = comp_res.json()["practitionersWatchdog"]
            if not watchdog:
                # Create a doctor for testing
                create_res = await ac.post("/api/v1/clinic/doctors", headers=self.headers, json={
                    "full_name": "Dr. Compliance Test",
                    "title": "Specialist Physician",
                    "specialty": "General Medicine",
                    "authority": "DHA",
                    "licence_number": "DHA-TEST-COMP-001",
                    "licence_expiry": "2024-01-01",  # Expired to test renewal gate
                    "consultation_fee": 300.0,
                    "is_active": True
                })
                self.assertEqual(create_res.status_code, 201)
                comp_res = await ac.get("/api/v1/clinic/compliance", headers=self.headers)
                watchdog = comp_res.json()["practitionersWatchdog"]

            self.assertGreater(len(watchdog), 0)
            target_doc = watchdog[0]
            doc_id = target_doc["id"]
            doc_name = target_doc.get("fullName") or "Dr. Compliance Test"

            # 2. Clinic submits Doctor License renewal request
            new_date = (date.today() + timedelta(days=365)).strftime("%Y-%m-%d")
            submit_res = await ac.post(
                "/api/v1/clinic/compliance/renewal-requests",
                data={
                    "request_type": "DOCTOR_LICENSE",
                    "target_id": doc_id,
                    "target_name": doc_name,
                    "document_code": "DOCTOR_LICENSE",
                    "document_number": "DHA-RN-778899",
                    "authority": "DHA",
                    "new_expiry_date": new_date,
                    "extracted_data": '{"fullName": "' + doc_name + '", "specialty": "General Medicine"}'
                },
                headers=self.headers
            )
            self.assertEqual(submit_res.status_code, 200, submit_res.text)
            req_id = submit_res.json()["requestId"]

            # Check that watchdog shows PENDING_REVIEW
            comp_pending = await ac.get("/api/v1/clinic/compliance", headers=self.headers)
            doc_pending = next(d for d in comp_pending.json()["practitionersWatchdog"] if d["id"] == doc_id)
            self.assertEqual(doc_pending["status"], "PENDING_REVIEW")

            # 3. Super Admin rejects with reason (Request Modification)
            async with SessionLocal() as s:
                admin = (await s.execute(text("""
                    SELECT u.id::text FROM users u
                    JOIN user_roles ur ON ur.user_id = u.id
                    JOIN roles r ON r.id = ur.role_id
                    WHERE r.name = 'SUPER_ADMIN' AND r.scope = 'PLATFORM'
                    LIMIT 1
                """))).mappings().first()
            admin_headers = {"Authorization": f"Bearer {create_access_token(admin['id'])}"}

            reject_res = await ac.post(
                f"/api/v1/platform-admin/compliance/renewals/{req_id}/reject",
                headers=admin_headers,
                json={"reason": "Document scan is blurry. Please provide a clear colored copy."}
            )
            self.assertEqual(reject_res.status_code, 200)
            self.assertEqual(reject_res.json()["status"], "REJECTED")

            # 4. Clinic sees REJECTED status with admin reason in Compliance Centre
            comp_rej = await ac.get("/api/v1/clinic/compliance", headers=self.headers)
            doc_rej = next(d for d in comp_rej.json()["practitionersWatchdog"] if d["id"] == doc_id)
            self.assertEqual(doc_rej["renewalStatus"], "REJECTED")
            self.assertIn("blurry", doc_rej["adminNotes"])

            # 5. Clinic re-submits a new scan
            resubmit_res = await ac.post(
                "/api/v1/clinic/compliance/renewal-requests",
                data={
                    "request_type": "DOCTOR_LICENSE",
                    "target_id": doc_id,
                    "target_name": doc_name,
                    "document_code": "DOCTOR_LICENSE",
                    "document_number": "DHA-RN-778899",
                    "authority": "DHA",
                    "new_expiry_date": new_date,
                    "extracted_data": '{"fullName": "' + doc_name + '", "specialty": "General Medicine"}'
                },
                headers=self.headers
            )
            self.assertEqual(resubmit_res.status_code, 200)
            new_req_id = resubmit_res.json()["requestId"]

            # 6. Super Admin Approves
            approve_res = await ac.post(
                f"/api/v1/platform-admin/compliance/renewals/{new_req_id}/approve",
                headers=admin_headers,
                json={"reason": "Approved high-resolution license renewal"}
            )
            self.assertEqual(approve_res.status_code, 200)
            self.assertEqual(approve_res.json()["status"], "APPROVED")

            # 7. Clinic reflects active status and updated license
            comp_final = await ac.get("/api/v1/clinic/compliance", headers=self.headers)
            doc_final = next(d for d in comp_final.json()["practitionersWatchdog"] if d["id"] == doc_id)
            self.assertIn(doc_final["status"], ("VALID", "ACTIVE"))
            self.assertEqual(doc_final["expiryDate"], new_date)
            self.assertTrue(doc_final["isEligibleForPublicListing"])

