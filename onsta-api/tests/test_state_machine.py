import unittest
from app.config import ClinicStatus
from app.core.state_machine import (
    ClinicStateMachine,
    InvalidStateTransitionError,
    DashboardAccessDeniedError
)

class TestClinicStateMachine(unittest.TestCase):
    def test_valid_onboarding_lifecycle(self):
        status = ClinicStatus.DRAFT
        
        # 1. Documents uploaded
        status = ClinicStateMachine.transition(status, ClinicStatus.DOCUMENTS_UPLOADED)
        self.assertEqual(status, ClinicStatus.DOCUMENTS_UPLOADED)
        
        # 2. Start AI Processing
        status = ClinicStateMachine.transition(status, ClinicStatus.PROCESSING)
        self.assertEqual(status, ClinicStatus.PROCESSING)
        
        # 3. Ready for Review
        status = ClinicStateMachine.transition(status, ClinicStatus.READY_FOR_REVIEW)
        self.assertEqual(status, ClinicStatus.READY_FOR_REVIEW)
        
        # 4. Submitted
        status = ClinicStateMachine.transition(status, ClinicStatus.SUBMITTED)
        self.assertEqual(status, ClinicStatus.SUBMITTED)
        
        # 5. Under Review
        status = ClinicStateMachine.transition(status, ClinicStatus.UNDER_REVIEW)
        self.assertEqual(status, ClinicStatus.UNDER_REVIEW)
        
        # 6. Approved
        status = ClinicStateMachine.transition(status, ClinicStatus.APPROVED)
        self.assertEqual(status, ClinicStatus.APPROVED)

    def test_illegal_jump_to_approved_raises_error(self):
        with self.assertRaises(InvalidStateTransitionError):
            ClinicStateMachine.transition(ClinicStatus.DRAFT, ClinicStatus.APPROVED)

    def test_illegal_jump_from_uploaded_to_approved_raises_error(self):
        with self.assertRaises(InvalidStateTransitionError):
            ClinicStateMachine.transition(ClinicStatus.DOCUMENTS_UPLOADED, ClinicStatus.APPROVED)

    def test_dashboard_gate_rejects_unapproved_states(self):
        unapproved_states = [
            ClinicStatus.DRAFT,
            ClinicStatus.DOCUMENTS_UPLOADED,
            ClinicStatus.PROCESSING,
            ClinicStatus.READY_FOR_REVIEW,
            ClinicStatus.SUBMITTED,
            ClinicStatus.UNDER_REVIEW,
            ClinicStatus.REJECTED
        ]
        for s in unapproved_states:
            with self.subTest(status=s):
                with self.assertRaises(DashboardAccessDeniedError):
                    ClinicStateMachine.assert_dashboard_access(s)

    def test_dashboard_gate_allows_approved_clinic(self):
        self.assertTrue(ClinicStateMachine.assert_dashboard_access(ClinicStatus.APPROVED))

if __name__ == "__main__":
    unittest.main()
