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

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return False

    async def execute(self, statement, params):
        self.statements.append((str(statement), params))
        return next(self.results)


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


if __name__ == "__main__":
    unittest.main()
