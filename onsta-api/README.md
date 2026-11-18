# ONSTA Clinic Partner API - Ingestion & AI Worker Engine

Production-grade FastAPI backend service powering sub-60-second clinic onboarding, AI regulatory document parsing, automated compliance evaluation, and dashboard access gating.

---

## 1. Core Architecture & Tech Stack

* **Backend Framework:** Python 3.11+ / FastAPI (Asynchronous I/O)
* **Database:** AWS RDS PostgreSQL (UUID PKs, JSONB extracted metadata)
* **Task Queue & Caching:** Redis (ARQ/BullMQ task queue & Idempotency store)
* **AI Multimodal Gateway:** Gemini 2.0 Flash (Fastest ~1.2s bilingual UAE document extraction at $0.10 / 1M tokens)
* **Object Storage:** AWS S3 (Direct client presigned PUT upload URLs)

---

## 2. Registration State Machine & Dashboard Gate

```
[DRAFT]
   │
   ▼ (Presigned S3 Upload)
[DOCUMENTS_UPLOADED]
   │
   ▼ (AI Multimodal Parsing)
[PROCESSING]
   │
   ▼ (Fields Pre-populated)
[READY_FOR_REVIEW]
   │
   ▼ (User Submits)
[SUBMITTED]
   ├──────────────────────────────┐
   │ (Rules 100% Pass)            │ (Discrepancies / Mismatched Names)
   ▼                              ▼
[APPROVED] ──🔓 Dashboard Open  [UNDER_REVIEW] ──🔒 Dashboard Locked
```

* **Dashboard Access Gate (`ClinicStateMachine.assert_dashboard_access`)**:
  * Blocks any requests to `/dashboard/*` with HTTP 403 / `DASHBOARD_LOCKED` unless status is `APPROVED`.

---

## 3. Idempotency & Consistency

* Client sends `Idempotency-Key` header on document extraction and submission calls.
* **Concurrent Calls:** Detects in-progress operations to prevent duplicate executions or double-billing AI requests.
* **Retries:** Returns cached responses instantly from Redis with 24h TTL.

---

## 4. Running Tests

```bash
python -m unittest discover -s tests -v
```

### Edge Cases Covered (16 Unit Tests):
1. `test_valid_onboarding_lifecycle`: DRAFT -> UPLOADED -> PROCESSING -> READY -> SUBMITTED -> APPROVED.
2. `test_illegal_jump_to_approved_raises_error`: Prevents bypassing intermediate onboarding stages.
3. `test_dashboard_gate_rejects_unapproved_states`: Blocks dashboard across all 7 unapproved states.
4. `test_dashboard_gate_allows_approved_clinic`: Verifies dashboard access unblocks upon approval.
5. `test_first_call_acquires_lock`: Idempotency lock acquisition.
6. `test_concurrent_call_detects_in_progress`: Prevents race conditions.
7. `test_completed_call_returns_cached_response`: Safe network retries.
8. `test_matching_documents_pass_with_high_confidence`: Valid bilingual matching.
9. `test_mismatched_company_names_flagged`: Cross-checks Trade License vs DHA Facility License.
10. `test_expired_trade_license_flagged`: Validates dates against today's date.
11. `test_missing_medical_director_flagged`: Enforces medical director credentials.
12. `test_mismatched_documents_stay_locked_in_under_review`: Discrepancies route to admin queue.
