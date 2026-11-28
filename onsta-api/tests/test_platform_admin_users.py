import json
import unittest
from unittest.mock import patch
from uuid import uuid4

from fastapi import HTTPException

from app.api.v1 import platform_admin


class MappingResult:
    def __init__(self, rows):
        self.rows = rows

    def all(self):
        return self.rows

    def first(self):
        return self.rows[0] if self.rows else None


class ExecuteResult:
    def __init__(self, *, scalar=None, rows=None):
        self.scalar = scalar
        self.rows = rows or []

    def scalar_one(self):
        return self.scalar

    def mappings(self):
        return MappingResult(self.rows)

    def first(self):
        return self.rows[0] if self.rows else None


class FakeSession:
    def __init__(self, results):
        self.results = iter(results)
        self.statements = []
        self.committed = False

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return False

    async def execute(self, statement, params):
        self.statements.append((str(statement), params))
        return next(self.results)

    async def commit(self):
        self.committed = True


class TestPlatformAdminUsers(unittest.IsolatedAsyncioTestCase):
    async def test_list_users_returns_paged_rows_and_applies_all_filters(self):
        row = {
            "user_id": str(uuid4()),
            "email": "clinic@example.test",
            "account_type": "CLINIC_USER",
            "roles": ["CLINIC_OWNER"],
            "clinics": ["Sample Clinic"],
        }
        session = FakeSession([
            ExecuteResult(scalar=1),
            ExecuteResult(rows=[row]),
        ])

        with patch.object(platform_admin, "SessionLocal", return_value=session):
            result = await platform_admin.list_users(
                search="Sample",
                account_type="clinic_user",
                status_filter="active",
                role="clinic_owner",
                clinic="Sample Clinic",
                limit=10,
                offset=20,
                actor={"id": str(uuid4())},
            )

        self.assertEqual(result["items"], [row])
        self.assertEqual(result["total"], 1)
        self.assertIn("FROM users u", session.statements[0][0])
        self.assertIn("r.name = 'SUPER_ADMIN'", session.statements[1][0])
        self.assertIn("u.status = :status", session.statements[0][0])
        self.assertIn("clinic_memberships", session.statements[0][0])
        self.assertEqual(session.statements[0][1], {
            "search": "%Sample%",
            "account_type": "CLINIC_USER",
            "status": "ACTIVE",
            "role": "CLINIC_OWNER",
            "clinic": "%Sample Clinic%",
        })
        self.assertEqual(session.statements[1][1]["limit"], 10)
        self.assertEqual(session.statements[1][1]["offset"], 20)

    async def test_list_users_without_filters_includes_every_user_type(self):
        session = FakeSession([
            ExecuteResult(scalar=1),
            ExecuteResult(rows=[]),
        ])

        with patch.object(platform_admin, "SessionLocal", return_value=session):
            result = await platform_admin.list_users(
                search=None,
                account_type=None,
                status_filter=None,
                role=None,
                clinic=None,
                limit=25,
                offset=0,
                actor={"id": str(uuid4())},
            )

        self.assertEqual(result["total"], 1)
        self.assertNotIn("WHERE", session.statements[0][0])
        self.assertIn("THEN 'PLATFORM_ADMIN'", session.statements[1][0])
        self.assertIn("THEN 'CLINIC_USER'", session.statements[1][0])
        self.assertIn("THEN 'CLINIC_APPLICANT'", session.statements[1][0])

    async def test_unsupported_account_type_is_rejected(self):
        with self.assertRaises(HTTPException) as raised:
            await platform_admin.list_users(
                search=None,
                account_type="ADMIN",
                status_filter=None,
                role=None,
                clinic=None,
                limit=25,
                offset=0,
                actor={"id": str(uuid4())},
            )

        self.assertEqual(raised.exception.status_code, 400)

    async def test_super_admin_guard_rejects_non_super_admin(self):
        session = FakeSession([ExecuteResult(rows=[])])

        with patch.object(platform_admin, "SessionLocal", return_value=session):
            with self.assertRaises(HTTPException) as raised:
                await platform_admin.require_super_admin({"id": str(uuid4())})

        self.assertEqual(raised.exception.status_code, 403)

    async def test_update_user_status_records_audit_and_commits(self):
        user_id = uuid4()
        actor_id = uuid4()
        session = FakeSession([
            ExecuteResult(rows=[{"status": "ACTIVE", "is_platform_admin": False}]),
            ExecuteResult(),
            ExecuteResult(),
        ])

        with patch.object(platform_admin, "SessionLocal", return_value=session):
            result = await platform_admin.update_user_status(
                user_id,
                platform_admin.UserStatusRequest(status="suspended", reason="Access review"),
                actor={"id": str(actor_id)},
            )

        self.assertEqual(result, {"user_id": str(user_id), "status": "SUSPENDED"})
        self.assertIn("UPDATE users", session.statements[1][0])
        self.assertIn("INSERT INTO audit_logs", session.statements[2][0])
        audit_details = json.loads(session.statements[2][1]["details"])
        self.assertEqual(audit_details["reason"], "Access review")
        self.assertEqual(audit_details["old_status"], "ACTIVE")
        self.assertEqual(audit_details["new_status"], "SUSPENDED")
        self.assertTrue(session.committed)

    async def test_update_user_status_does_not_activate_invited_accounts(self):
        user_id = uuid4()
        session = FakeSession([ExecuteResult(rows=[{"status": "INVITED", "is_platform_admin": False}])])

        with patch.object(platform_admin, "SessionLocal", return_value=session):
            with self.assertRaises(HTTPException) as raised:
                await platform_admin.update_user_status(
                    user_id,
                    platform_admin.UserStatusRequest(status="ACTIVE", reason="Invite bypass attempt"),
                    actor={"id": str(uuid4())},
                )

        self.assertEqual(raised.exception.status_code, 409)
        self.assertFalse(session.committed)

    async def test_update_user_status_protects_the_last_active_super_admin(self):
        user_id = uuid4()
        session = FakeSession([
            ExecuteResult(rows=[{"status": "ACTIVE", "is_platform_admin": True}]),
            ExecuteResult(scalar=1),
        ])

        with patch.object(platform_admin, "SessionLocal", return_value=session):
            with self.assertRaises(HTTPException) as raised:
                await platform_admin.update_user_status(
                    user_id,
                    platform_admin.UserStatusRequest(status="DISABLED", reason="Access review"),
                    actor={"id": str(uuid4())},
                )

        self.assertEqual(raised.exception.status_code, 409)
        self.assertFalse(session.committed)

    async def test_overview_returns_platform_and_ai_counts(self):
        session = FakeSession([
            ExecuteResult(rows=[{"status": "ACTIVE", "count": 4}]),
            ExecuteResult(rows=[{"status": "SUBMITTED", "count": 2}]),
            ExecuteResult(scalar=3),
            ExecuteResult(rows=[{"status": "FAILED", "count": 1}]),
            ExecuteResult(scalar=5),
            ExecuteResult(scalar=2),
            ExecuteResult(scalar=1),
            ExecuteResult(scalar=1),
            ExecuteResult(rows=[{
                "clinic_id": "clinic-1",
                "trading_name": "Care Clinic",
                "trade_license_expiry_date": "2026-12-01",
                "facility_license_expiry_date": "2026-12-15",
            }]),
            ExecuteResult(scalar=9),
            ExecuteResult(scalar=6),
            ExecuteResult(scalar=10),
            ExecuteResult(scalar=0),
            ExecuteResult(scalar=0),
            ExecuteResult(scalar=0),
            ExecuteResult(scalar=0),
            ExecuteResult(rows=[]),
        ])

        with patch.object(platform_admin, "SessionLocal", return_value=session):
            result = await platform_admin.get_platform_overview(actor={"id": str(uuid4())})

        self.assertEqual(result["users"], {"ACTIVE": 4})
        self.assertEqual(result["applications"], {"SUBMITTED": 2})
        self.assertEqual(result["registered_clinics"], 3)
        self.assertEqual(result["ai"]["scan_jobs"], {"FAILED": 1})
        self.assertEqual(result["system_health"]["database"], "HEALTHY")
        self.assertEqual(result["open_info_requests"], 5)
        self.assertEqual(result["clinics_awaiting_activation"], 2)
        self.assertEqual(result["new_clinics_this_month"], 1)
        self.assertEqual(result["expiring_licenses_total"], 1)
        self.assertEqual(len(result["expiring_licenses"]), 1)
        self.assertEqual(result["expiring_licenses"][0]["trading_name"], "Care Clinic")

    async def test_list_audit_logs(self):
        log_id = str(uuid4())
        session = FakeSession([
            ExecuteResult(scalar=1),
            ExecuteResult(rows=[{
                "id": log_id,
                "actor_user_id": str(uuid4()),
                "actor_name": "ONSTA Admin",
                "actor_email": "admin@helcoo.com",
                "tenant_id": None,
                "tenant_name": None,
                "action": "USER_STATUS_CHANGED",
                "entity_type": "USER",
                "entity_id": str(uuid4()),
                "details": {"reason": "Test audit"},
                "ip_address": None,
                "created_at": "2026-11-23T12:00:00Z",
            }]),
        ])

        with patch.object(platform_admin, "SessionLocal", return_value=session):
            result = await platform_admin.list_audit_logs(
                search=None,
                action=None,
                entity_type=None,
                limit=25,
                offset=0,
                actor={"id": str(uuid4())},
            )

        self.assertEqual(result["total"], 1)
        self.assertEqual(len(result["items"]), 1)
        self.assertEqual(result["items"][0]["action"], "USER_STATUS_CHANGED")
        self.assertEqual(result["items"][0]["actor_name"], "ONSTA Admin")


if __name__ == "__main__":
    unittest.main()
