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


class TestRegisteredClinicAdminEndpoints(unittest.IsolatedAsyncioTestCase):
    async def test_list_only_queries_approved_clinics_and_applies_filters(self):
        row = {
            "clinic_id": str(uuid4()),
            "trading_name": "Sample Clinic",
            "tenant_status": "ACTIVE",
        }
        session = FakeSession([
            ExecuteResult(scalar=1),
            ExecuteResult(rows=[row]),
        ])

        with patch.object(platform_admin, "SessionLocal", return_value=session):
            result = await platform_admin.list_registered_clinics(
                search="Sample",
                emirate="Dubai",
                tenant_status="active",
                limit=10,
                offset=20,
                actor={"id": str(uuid4())},
            )

        self.assertEqual(result["items"], [row])
        self.assertEqual(result["total"], 1)
        self.assertIn("a.application_status = 'APPROVED'", session.statements[0][0])
        self.assertIn("a.application_status = 'APPROVED'", session.statements[1][0])
        self.assertEqual(session.statements[0][1], {
            "search": "%Sample%",
            "emirate": "Dubai",
            "tenant_status": "ACTIVE",
        })
        self.assertEqual(session.statements[1][1]["limit"], 10)
        self.assertEqual(session.statements[1][1]["offset"], 20)

    async def test_detail_does_not_return_unapproved_application(self):
        session = FakeSession([ExecuteResult(rows=[])])

        with patch.object(platform_admin, "SessionLocal", return_value=session):
            with self.assertRaises(HTTPException) as raised:
                await platform_admin.get_registered_clinic(uuid4(), actor={"id": str(uuid4())})

        self.assertEqual(raised.exception.status_code, 404)
        self.assertIn("a.application_status = 'APPROVED'", session.statements[0][0])


if __name__ == "__main__":
    unittest.main()
