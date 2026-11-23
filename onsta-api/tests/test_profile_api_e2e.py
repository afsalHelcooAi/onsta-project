import unittest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.db.database import SessionLocal
from sqlalchemy import text
from app.core.security import create_access_token

class TestClinicProfileE2E(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.transport = ASGITransport(app=app)
        async with SessionLocal() as s:
            # Fetch an active user for an approved clinic
            user = (await s.execute(text("""
                SELECT u.id::text, u.email
                FROM users u
                JOIN clinic_applications a ON a.submitted_by_user_id = u.id
                WHERE a.application_status = 'APPROVED'
                LIMIT 1
            """))).mappings().first()

            if not user:
                # Fallback to any active user
                user = (await s.execute(text("SELECT id::text, email FROM users LIMIT 1"))).mappings().first()

            self.user_id = user["id"]
            self.token = create_access_token(self.user_id)
            self.headers = {"Authorization": f"Bearer {self.token}"}

    async def asyncTearDown(self):
        from app.db.database import engine
        await engine.dispose()

    async def test_get_clinic_profile(self):
        async with AsyncClient(transport=self.transport, base_url="http://test") as ac:
            res = await ac.get("/api/v1/clinic/profile", headers=self.headers)
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertIn("displayName", data)
            self.assertIn("legalName", data)
            self.assertIn("gallery", data)

    async def test_put_clinic_profile_mohap_violation(self):
        async with AsyncClient(transport=self.transport, base_url="http://test") as ac:
            res = await ac.put("/api/v1/clinic/profile", headers=self.headers, json={
                "display_name": "Best Laser Clinic in Dubai #1",
                "public_description": "We guarantee 100% cure rate at cheapest prices.",
                "contact_phone": "+971 50 123 4567",
                "company_email": "clinic@test.ae",
                "address": "Villa 1, Dubai"
            })
            self.assertEqual(res.status_code, 422)
            self.assertIn("MOHAP Compliance Violation", res.json()["detail"])

    async def test_put_clinic_profile_valid(self):
        async with AsyncClient(transport=self.transport, base_url="http://test") as ac:
            res = await ac.put("/api/v1/clinic/profile", headers=self.headers, json={
                "display_name": "Al Noor Medical & Laser Center",
                "public_description": "Certified aesthetic clinic delivering evidence-based dermatological laser care.",
                "contact_phone": "+971 50 123 4567",
                "company_email": "info@alnoorclinic.ae",
                "website": "https://alnoorclinic.ae",
                "city_area": "Jumeirah 1",
                "address": "Villa 14, Al Wasl Road, Jumeirah 1, Dubai",
                "opening_hours": "Mon - Sat: 9:00 AM - 8:00 PM | Sun: Closed"
            })
            self.assertEqual(res.status_code, 200)
            self.assertIn("updated successfully", res.json()["message"])

if __name__ == '__main__':
    unittest.main()
