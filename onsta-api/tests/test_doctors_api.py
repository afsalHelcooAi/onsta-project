import unittest
import io
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.db.database import SessionLocal
from sqlalchemy import text
from app.core.security import create_access_token
from app.api.v1.clinic_doctors import parse_doctor_license_text


class TestDoctorLicenseParser(unittest.TestCase):
    def test_dha_license_parsing(self):
        sample_dha = """
        GOVERNMENT OF DUBAI
        DUBAI HEALTH AUTHORITY
        HEALTH PROFESSIONAL LICENSE
        Practitioner Name: Dr. Sarah Al Mansoori
        Category: Consultant Dermatologist & Laser Surgeon
        Specialty: Dermatology & Aesthetic Medicine
        License Number: DHA-P-0091823
        Issue Date: 15/05/2024
        Expiry Date: 2029-05-15
        Status: Active
        """
        parsed = parse_doctor_license_text(sample_dha)
        self.assertEqual(parsed["full_name"], "Dr. Sarah Al Mansoori")
        self.assertEqual(parsed["licence_number"], "DHA-P-0091823")
        self.assertEqual(parsed["authority"], "DHA")
        self.assertIn("Dermatologist", parsed["title"])
        self.assertEqual(parsed["licence_expiry"], "2029-05-15")

    def test_doh_license_parsing(self):
        sample_doh = """
        ABU DHABI DEPARTMENT OF HEALTH
        PROFESSIONAL MEDICAL PRACTICE PERMIT
        Name of Professional: Dr. Marcus Vance
        Title: Specialist Plastic Surgeon
        Field: Plastic & Reconstructive Surgery
        License No: DOH-P-771234
        Valid To: 2028-11-20
        """
        parsed = parse_doctor_license_text(sample_doh)
        self.assertEqual(parsed["full_name"], "Dr. Marcus Vance")
        self.assertEqual(parsed["licence_number"], "DOH-P-771234")
        self.assertEqual(parsed["authority"], "DOH")
        self.assertIn("Plastic", parsed["title"])
        self.assertEqual(parsed["licence_expiry"], "2028-11-20")


class TestClinicDoctorsE2E(unittest.IsolatedAsyncioTestCase):
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
            self.token = create_access_token(self.user_id)
            self.headers = {"Authorization": f"Bearer {self.token}"}

            # Clean up any leftover test practitioners
            await s.execute(text("DELETE FROM practitioner_licenses WHERE license_number IN ('DHA-P-0044812', 'DHA-P-0044812-R', 'DHA-P-9999999')"))
            await s.execute(text("DELETE FROM practitioners WHERE full_name IN ('Dr. Fatima Al Nuaimi', 'Dr. Omar Al Mansoori')"))
            await s.commit()

    async def asyncTearDown(self):
        from app.db.database import engine
        await engine.dispose(close=False)

    async def test_doctor_lifecycle(self):
        async with AsyncClient(transport=self.transport, base_url="http://test") as ac:
            # 1. Create Doctor
            create_payload = {
                "full_name": "Dr. Fatima Al Nuaimi",
                "title": "Specialist Dermatologist",
                "specialty": "Dermatology & Aesthetic Medicine",
                "service": "Hydrafacial MD Deep Extraction & Peptide Infusion",
                "authority": "DHA",
                "licence_number": "DHA-P-0044812",
                "licence_expiry": "2029-08-30",
                "consultation_fee": 450.0,
                "languages": "English, Arabic",
                "qualifications": "MD, Board Certified Dermatologist, 10 yrs exp",
                "available_days": "Mon, Tue, Thu",
                "phone": "+971 50 889 1234",
                "email": "fatima.nuaimi@clinic.ae",
                "is_active": True
            }
            res = await ac.post("/api/v1/clinic/doctors", headers=self.headers, json=create_payload)
            self.assertEqual(res.status_code, 201)
            doctor_data = res.json()
            doctor_id = doctor_data["id"]
            self.assertEqual(doctor_data["fullName"], "Dr. Fatima Al Nuaimi")
            self.assertEqual(doctor_data["licenceNumber"], "DHA-P-0044812")
            self.assertEqual(doctor_data.get("service"), "Hydrafacial MD Deep Extraction & Peptide Infusion")

            # 1b. Duplicate License Check: Attempting to register another doctor with same licence number should return 409
            dup_payload = {
                "full_name": "Dr. Another Doctor",
                "title": "Specialist Dermatologist",
                "specialty": "Dermatology",
                "service": "Full Body Laser Hair Removal",
                "authority": "DHA",
                "licence_number": "DHA-P-0044812",
                "consultation_fee": 300.0,
            }
            res_dup = await ac.post("/api/v1/clinic/doctors", headers=self.headers, json=dup_payload)
            self.assertEqual(res_dup.status_code, 409)
            self.assertIn("already registered", res_dup.json()["detail"].lower())

            # 2. Get Doctors List
            res_list = await ac.get("/api/v1/clinic/doctors", headers=self.headers)
            self.assertEqual(res_list.status_code, 200)
            doctors = res_list.json()
            self.assertTrue(any(d["id"] == doctor_id for d in doctors))
            fatima = next(d for d in doctors if d["id"] == doctor_id)
            self.assertEqual(fatima.get("service"), "Hydrafacial MD Deep Extraction & Peptide Infusion")

            # 3. Update Doctor (same doctor keeping their own license should succeed)
            update_payload = {
                "consultation_fee": 500.0,
                "service": "Full Body Laser Hair Removal (GentleMax Pro)",
                "licence_number": "DHA-P-0044812",
                "title": "Senior Consultant Dermatologist",
                "available_days": "Sun, Tue, Thu"
            }
            res_up = await ac.put(f"/api/v1/clinic/doctors/{doctor_id}", headers=self.headers, json=update_payload)
            self.assertEqual(res_up.status_code, 200)

            # 3b. Test Doctor License Renewal
            renew_payload = {
                "new_expiry_date": "2028-12-31",
                "licence_number": "DHA-P-0044812-R",
                "authority": "DHA"
            }
            res_renew = await ac.post(f"/api/v1/clinic/doctors/{doctor_id}/renew-license", headers=self.headers, json=renew_payload)
            self.assertEqual(res_renew.status_code, 200)
            self.assertEqual(res_renew.json()["status"], "success")
            self.assertGreater(res_renew.json()["days_remaining"], 0)

            # 3b. Create a 2nd doctor and test updating the 2nd doctor with 1st doctor's license (should return 409)
            doc2_payload = {
                "full_name": "Dr. Omar Al Mansoori",
                "title": "Specialist Plastic Surgeon",
                "specialty": "Plastic Surgery",
                "authority": "DHA",
                "licence_number": "DHA-P-9999999",
                "consultation_fee": 600.0,
            }
            res_doc2 = await ac.post("/api/v1/clinic/doctors", headers=self.headers, json=doc2_payload)
            self.assertEqual(res_doc2.status_code, 201)
            doc2_id = res_doc2.json()["id"]

            res_up_dup = await ac.put(f"/api/v1/clinic/doctors/{doc2_id}", headers=self.headers, json={"licence_number": "DHA-P-0044812"})
            self.assertEqual(res_up_dup.status_code, 409)
            self.assertIn("already registered", res_up_dup.json()["detail"].lower())

            # Cleanup 2nd doctor
            await ac.delete(f"/api/v1/clinic/doctors/{doc2_id}", headers=self.headers)

            # 4. Toggle Status
            res_toggle = await ac.patch(
                f"/api/v1/clinic/doctors/{doctor_id}/status",
                headers=self.headers,
                json={"is_active": False}
            )
            self.assertEqual(res_toggle.status_code, 200)
            self.assertFalse(res_toggle.json()["isActive"])

            # 5. Delete Doctor
            res_del = await ac.delete(f"/api/v1/clinic/doctors/{doctor_id}", headers=self.headers)
            self.assertEqual(res_del.status_code, 200)

            # 6. Verify Deletion
            res_list2 = await ac.get("/api/v1/clinic/doctors", headers=self.headers)
            self.assertFalse(any(d["id"] == doctor_id for d in res_list2.json()))

    async def test_scan_license_soft_warning_for_misuploaded_mohap_advertising(self):
        """Verify that uploading a MOHAP advertising permit to doctor scan returns 200 with soft warning for Step 2."""
        async with AsyncClient(transport=self.transport, base_url="http://test") as ac:
            import pymupdf as fitz
            doc = fitz.open()
            page = doc.new_page()
            page.insert_text(
                (50, 50),
                "MINISTRY OF HEALTH & PREVENTION\nHEALTH ADVERTISEMENT APPROVAL\nPermit No: MOHAP-ADV-2024-8831\nInstitution: Al Noor Clinic LLC\nValid Until: 2027-12-31"
            )
            pdf_bytes = doc.tobytes()
            doc.close()

            files = {"file": ("mohap_advertising_approval.pdf", pdf_bytes, "application/pdf")}
            res = await ac.post("/api/v1/clinic/doctors/scan-license", headers=self.headers, files=files)
            self.assertEqual(res.status_code, 200)
            self.assertIsNotNone(res.json().get("warning"))
            self.assertIn("Advertising Permit", res.json()["warning"])


if __name__ == '__main__':
    unittest.main()
