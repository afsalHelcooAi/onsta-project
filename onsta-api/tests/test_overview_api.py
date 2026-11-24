import unittest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.db.database import SessionLocal, engine
from sqlalchemy import text
from app.core.security import create_access_token


class TestClinicOverviewE2E(unittest.IsolatedAsyncioTestCase):
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
        await engine.dispose()

    async def test_clinic_overview_aggregation(self):
        async with AsyncClient(transport=self.transport, base_url="http://test") as ac:
            res = await ac.get("/api/v1/clinic/overview", headers=self.headers)
            self.assertEqual(res.status_code, 200, res.text)
            data = res.json()
            self.assertEqual(data["status"], "success")

            # Check clinic details
            self.assertIn("clinic", data)
            self.assertIn("displayName", data["clinic"])
            self.assertIn("publicListingActive", data["clinic"])

            # Check KPIs
            self.assertIn("kpis", data)
            self.assertIn("doctors", data["kpis"])
            self.assertIn("services", data["kpis"])
            self.assertIn("compliance", data["kpis"])

            # Check collections
            self.assertIn("credentials", data)
            self.assertIn("doctors", data)
            self.assertIn("services", data)
            self.assertIn("alerts", data)
