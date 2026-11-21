from typing import Set, Dict
from app.config import ClinicStatus

# Strict State Machine Transition Graph
VALID_TRANSITIONS: Dict[ClinicStatus, Set[ClinicStatus]] = {
    ClinicStatus.DRAFT: {
        ClinicStatus.DOCUMENTS_UPLOADED,
        ClinicStatus.PROCESSING
    },
    ClinicStatus.DOCUMENTS_UPLOADED: {
        ClinicStatus.PROCESSING,
        ClinicStatus.DRAFT
    },
    ClinicStatus.PROCESSING: {
        ClinicStatus.READY_FOR_REVIEW,
        ClinicStatus.DRAFT # in case of fatal parse failure fallback
    },
    ClinicStatus.READY_FOR_REVIEW: {
        ClinicStatus.SUBMITTED,
        ClinicStatus.DOCUMENTS_UPLOADED
    },
    ClinicStatus.SUBMITTED: {
        ClinicStatus.UNDER_REVIEW,
    },
    ClinicStatus.UNDER_REVIEW: {
        ClinicStatus.APPROVED,
        ClinicStatus.REJECTED,
        ClinicStatus.READY_FOR_REVIEW,
        ClinicStatus.ADDITIONAL_INFO_REQUESTED,
    },
    ClinicStatus.ADDITIONAL_INFO_REQUESTED: {
        ClinicStatus.READY_FOR_REVIEW,
        ClinicStatus.SUBMITTED,
        ClinicStatus.REJECTED,
    },
    ClinicStatus.APPROVED: {
        ClinicStatus.UNDER_REVIEW # Re-eval if document expires
    },
    ClinicStatus.REJECTED: {
        ClinicStatus.READY_FOR_REVIEW # Re-apply after fixes
    }
}

class InvalidStateTransitionError(Exception):
    def __init__(self, current_status: ClinicStatus, target_status: ClinicStatus):
        super().__init__(
            f"Invalid status transition from {current_status.value} to {target_status.value}. "
            f"Allowed transitions: {[s.value for s in VALID_TRANSITIONS.get(current_status, set())]}"
        )
        self.current_status = current_status
        self.target_status = target_status

class DashboardAccessDeniedError(Exception):
    def __init__(self, current_status: ClinicStatus):
        super().__init__(
            f"Dashboard access locked. Clinic status is '{current_status.value}'. "
            f"Approval from ONSTA compliance is required to enter the dashboard."
        )
        self.current_status = current_status
        self.code = "DASHBOARD_LOCKED"

class ClinicStateMachine:
    @staticmethod
    def can_transition(current: ClinicStatus, target: ClinicStatus) -> bool:
        allowed = VALID_TRANSITIONS.get(current, set())
        return target in allowed

    @staticmethod
    def transition(current: ClinicStatus, target: ClinicStatus) -> ClinicStatus:
        if not ClinicStateMachine.can_transition(current, target):
            raise InvalidStateTransitionError(current, target)
        return target

    @staticmethod
    def assert_dashboard_access(status: ClinicStatus) -> bool:
        """
        Dashboard Gate:
        Only APPROVED clinics are allowed dashboard access.
        All other states (DRAFT, PROCESSING, SUBMITTED, UNDER_REVIEW, REJECTED) are blocked.
        """
        if status != ClinicStatus.APPROVED:
            raise DashboardAccessDeniedError(status)
        return True
