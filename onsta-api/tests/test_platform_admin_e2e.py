import unittest
import httpx
from app.main import app


class TestPlatformAdminE2E(unittest.IsolatedAsyncioTestCase):
    async def test_all_platform_admin_endpoints(self):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Login
            login_res = await client.post("/api/v1/auth/login", json={
                "email": "superadmin@helcoo.com",
                "password": "superadmin@123"
            })
            self.assertEqual(login_res.status_code, 200)
            token = login_res.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            # 2. Auth me
            me_res = await client.get("/api/v1/auth/me", headers=headers)
            self.assertEqual(me_res.status_code, 200)
            self.assertEqual(me_res.json()["user"]["workspace"], "SUPER_ADMIN")

            # 3. Platform overview
            overview_res = await client.get("/api/v1/platform-admin/overview", headers=headers)
            self.assertEqual(overview_res.status_code, 200)
            self.assertIn("registered_clinics", overview_res.json())

            # 4. Users list
            users_res = await client.get("/api/v1/platform-admin/users", headers=headers)
            self.assertEqual(users_res.status_code, 200)
            users = users_res.json()["items"]
            self.assertGreater(len(users), 0)

            # Find non-admin user to test status transition
            target_user = next((u for u in users if "SUPER_ADMIN" not in u.get("roles", [])), None)
            if target_user:
                target_user_id = target_user["user_id"]

                # 5. Suspend User
                suspend_res = await client.patch(
                    f"/api/v1/platform-admin/users/{target_user_id}/status",
                    headers=headers,
                    json={"status": "SUSPENDED", "reason": "Automated regression test suspension"}
                )
                self.assertEqual(suspend_res.status_code, 200)
                self.assertEqual(suspend_res.json()["status"], "SUSPENDED")

                # 6. Reactivate User
                reactivate_res = await client.patch(
                    f"/api/v1/platform-admin/users/{target_user_id}/status",
                    headers=headers,
                    json={"status": "ACTIVE", "reason": "Automated regression test reactivation"}
                )
                self.assertEqual(reactivate_res.status_code, 200)
                self.assertEqual(reactivate_res.json()["status"], "ACTIVE")

            # 7. User roles
            roles_res = await client.get("/api/v1/platform-admin/users/roles", headers=headers)
            self.assertEqual(roles_res.status_code, 200)

            # 8. Audit logs
            audit_res = await client.get("/api/v1/platform-admin/audit-logs", headers=headers)
            self.assertEqual(audit_res.status_code, 200)
            self.assertIn("items", audit_res.json())

            # 9. Compliance
            comp_res = await client.get("/api/v1/platform-admin/compliance", headers=headers)
            self.assertEqual(comp_res.status_code, 200)
            self.assertIn("items", comp_res.json())

            # 10. Registered clinics
            clinics_res = await client.get("/api/v1/platform-admin/clinics", headers=headers)
            self.assertEqual(clinics_res.status_code, 200)
            self.assertIn("items", clinics_res.json())

            # 11. Applications
            apps_res = await client.get("/api/v1/platform-admin/applications", headers=headers)
            self.assertEqual(apps_res.status_code, 200)


if __name__ == "__main__":
    unittest.main()
