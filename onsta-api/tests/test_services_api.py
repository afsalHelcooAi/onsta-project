import unittest
import uuid
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.db.database import SessionLocal
from sqlalchemy import text
from app.core.security import create_access_token
from app.api.v1.clinic_services import extract_services_from_tariff_text


class TestTariffParser(unittest.TestCase):
    def test_extract_services_from_tariff_text(self):
        sample_tariff = """
        AL NOOR MEDICAL CLINIC - AESTHETIC TARIFF SHEET 2026
        Hydrafacial MD Deluxe Treatment - 45 mins - AED 550
        Candela GentleMax Pro Full Legs Laser - 60 mins - AED 850 (Special: 599 AED)
        PRP Vampire Facial with Micro-Needling - 50 mins - 950 AED
        SkinPen Precision Micro-Needling - 45 mins - 700 AED
        ZO Skin Health Ultra Hydration Facial - 60 mins - 400 AED
        Carbon Spectra Laser Peel - 40 mins - 650 AED
        """
        extracted = extract_services_from_tariff_text(sample_tariff)
        self.assertGreaterEqual(len(extracted), 4)

        names = [item["name"] for item in extracted]
        self.assertTrue(any("Hydrafacial" in n for n in names))
        self.assertTrue(any("Candela" in n for n in names))
        self.assertTrue(any("PRP" in n for n in names))

        laser_item = next(item for item in extracted if "Candela" in item["name"])
        self.assertEqual(laser_item["category"], "Laser Clinic")
        self.assertEqual(laser_item["scope_required"], "Class 4 Medical Laser Facility Scope")
        self.assertEqual(laser_item["normal_price"], 850.0)


class TestClinicServicesE2E(unittest.IsolatedAsyncioTestCase):
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

    async def asyncTearDown(self):
        async with SessionLocal() as s:
            await s.execute(text("DELETE FROM services WHERE name LIKE '%Profhilo%' OR name LIKE '%Morpheus8%';"))
            await s.commit()

    async def test_services_lifecycle(self):
        run_id = uuid.uuid4().hex[:6]
        service_name_1 = f"Profhilo Face & Neck Bio-Remodelling {run_id}"
        service_name_2 = f"Morpheus8 RF Microneedling {run_id}"

        async with AsyncClient(transport=self.transport, base_url="http://test") as ac:
            # 1. Parse tariff sheet sample
            resp = await ac.post("/api/v1/clinic/services/parse-tariff", data={"use_sample": "true"}, headers=self.headers)
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertEqual(data["status"], "success")
            self.assertGreater(data["totalFound"], 0)

            # 2. Create single service
            create_payload = {
                "name": service_name_1,
                "category": "Dermatology",
                "description": "High concentration ultra-pure hyaluronic acid skin laxity treatment.",
                "duration": "30 mins",
                "normal_price": 1400.0,
                "offer_price": 1199.0,
                "scope_required": "Clinical Dermatology Scope",
                "is_active": True
            }
            create_resp = await ac.post("/api/v1/clinic/services", json=create_payload, headers=self.headers)
            self.assertEqual(create_resp.status_code, 201)
            srv_created = create_resp.json()
            srv_id = srv_created["id"]
            self.assertEqual(srv_created["name"], service_name_1)

            # 3. Prevent duplicate creation (HTTP 409)
            dup_resp = await ac.post("/api/v1/clinic/services", json=create_payload, headers=self.headers)
            self.assertEqual(dup_resp.status_code, 409)

            # 4. List services
            list_resp = await ac.get("/api/v1/clinic/services", headers=self.headers)
            self.assertEqual(list_resp.status_code, 200)
            services = list_resp.json()
            self.assertTrue(any(s["id"] == srv_id for s in services))

            # 5. Update service
            update_payload = {
                "normal_price": 1350.0,
                "duration": "35 mins"
            }
            update_resp = await ac.put(f"/api/v1/clinic/services/{srv_id}", json=update_payload, headers=self.headers)
            self.assertEqual(update_resp.status_code, 200)

            # 6. Toggle status
            toggle_resp = await ac.patch(f"/api/v1/clinic/services/{srv_id}/status", json={"is_active": False}, headers=self.headers)
            self.assertEqual(toggle_resp.status_code, 200)
            self.assertFalse(toggle_resp.json()["isActive"])

            # 7. Batch create services (from parsed items)
            batch_payload = {
                "services": [
                    {
                        "name": service_name_2,
                        "category": "Aesthetic Clinic",
                        "description": "Subdermal adipose remodeling device with radiofrequency.",
                        "duration": "60 mins",
                        "normal_price": 1800.0,
                        "offer_price": 1499.0,
                        "scope_required": "Aesthetic Medicine Scope",
                        "is_active": True
                    },
                    {
                        "name": service_name_1,  # duplicate, should be skipped
                        "category": "Dermatology",
                        "duration": "30 mins",
                        "normal_price": 1400.0,
                        "is_active": True
                    }
                ]
            }
            batch_resp = await ac.post("/api/v1/clinic/services/batch", json=batch_payload, headers=self.headers)
            self.assertEqual(batch_resp.status_code, 201)
            batch_data = batch_resp.json()
            self.assertEqual(batch_data["createdCount"], 1)
            self.assertEqual(batch_data["skippedCount"], 1)

            # 8. Delete service
            del_resp = await ac.delete(f"/api/v1/clinic/services/{srv_id}", headers=self.headers)
            self.assertEqual(del_resp.status_code, 200)

            # Clean up batch created service
            if batch_data["items"]:
                b_id = batch_data["items"][0]["id"]
                await ac.delete(f"/api/v1/clinic/services/{b_id}", headers=self.headers)
