-- Step 4 additive migration for the existing starter PostgreSQL database.
-- Apply this once to onsta_clinic_db before restarting the updated API.
-- This preserves the three starter tables and adds standalone onboarding data.

BEGIN;

CREATE TABLE IF NOT EXISTS clinic_invitations (
  id VARCHAR(36) PRIMARY KEY,
  clinic_name VARCHAR(200) NOT NULL,
  contact_name VARCHAR(180),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(32),
  emirate VARCHAR(60),
  facility_type VARCHAR(100),
  source VARCHAR(32) NOT NULL DEFAULT 'EMAIL',
  sales_representative VARCHAR(180),
  referral_partner VARCHAR(180),
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(24) NOT NULL DEFAULT 'SENT',
  expires_at TIMESTAMPTZ NOT NULL,
  created_by VARCHAR(180),
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_clinic_invitation_source CHECK (source IN ('EMAIL','WHATSAPP','QR_CODE','SALES','PARTNER_REFERRAL','PUBLIC_PAGE')),
  CONSTRAINT ck_clinic_invitation_status CHECK (status IN ('PENDING','SENT','ACCEPTED','EXPIRED','REVOKED'))
);

CREATE TABLE IF NOT EXISTS document_types (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(60) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  scope VARCHAR(24) NOT NULL DEFAULT 'APPLICATION',
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO document_types (id, code, name, scope) VALUES
  ('00000000-0000-4000-8000-000000000001','TRADE_LICENSE','Trade license','APPLICATION'),
  ('00000000-0000-4000-8000-000000000002','FACILITY_LICENSE','Healthcare facility license','APPLICATION'),
  ('00000000-0000-4000-8000-000000000003','MOHAP_ADVERTISING','Healthcare advertising permit','APPLICATION'),
  ('00000000-0000-4000-8000-000000000004','COMPANY_REGISTRATION','Company registration document','APPLICATION'),
  ('00000000-0000-4000-8000-000000000005','AUTHORIZED_REP_ID','Authorized representative identity document','APPLICATION'),
  ('00000000-0000-4000-8000-000000000006','AUTHORIZATION_LETTER','Authorization letter','APPLICATION'),
  ('00000000-0000-4000-8000-000000000007','BRANCH_LICENSE','Branch license','BRANCH'),
  ('00000000-0000-4000-8000-000000000008','DOCTOR_LICENSE','Practitioner professional license','PRACTITIONER'),
  ('00000000-0000-4000-8000-000000000009','QUALIFICATION_CERTIFICATE','Practitioner qualification certificate','PRACTITIONER')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS facility_document_requirements (
  id VARCHAR(36) PRIMARY KEY,
  emirate VARCHAR(60) NOT NULL,
  authority VARCHAR(100) NOT NULL,
  facility_type VARCHAR(100) NOT NULL,
  document_code VARCHAR(60) NOT NULL REFERENCES document_types(code) ON DELETE RESTRICT,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT ck_document_requirement_dates CHECK (valid_until IS NULL OR valid_until >= valid_from),
  CONSTRAINT uq_facility_doc_requirement_version UNIQUE(emirate, authority, facility_type, document_code, version)
);

ALTER TABLE clinic_applications ADD COLUMN IF NOT EXISTS application_reference VARCHAR(40);
ALTER TABLE clinic_applications ADD COLUMN IF NOT EXISTS invitation_id VARCHAR(36) REFERENCES clinic_invitations(id) ON DELETE SET NULL;
ALTER TABLE clinic_applications ADD COLUMN IF NOT EXISTS source VARCHAR(32) NOT NULL DEFAULT 'PUBLIC_PAGE';
ALTER TABLE clinic_applications ADD COLUMN IF NOT EXISTS application_status VARCHAR(32) NOT NULL DEFAULT 'DRAFT';
ALTER TABLE clinic_applications ADD COLUMN IF NOT EXISTS contact_name VARCHAR(180);
ALTER TABLE clinic_applications ADD COLUMN IF NOT EXISTS contact_title VARCHAR(120);
ALTER TABLE clinic_applications ADD COLUMN IF NOT EXISTS facility_type VARCHAR(100);
ALTER TABLE clinic_applications ADD COLUMN IF NOT EXISTS company_registration_number VARCHAR(100);
ALTER TABLE clinic_applications ADD COLUMN IF NOT EXISTS trade_license_number VARCHAR(100);
ALTER TABLE clinic_applications ADD COLUMN IF NOT EXISTS trade_license_authority VARCHAR(100);
ALTER TABLE clinic_applications ADD COLUMN IF NOT EXISTS trade_license_issue_date DATE;
ALTER TABLE clinic_applications ADD COLUMN IF NOT EXISTS trade_license_expiry_date DATE;
ALTER TABLE clinic_applications ADD COLUMN IF NOT EXISTS facility_license_number VARCHAR(100);
ALTER TABLE clinic_applications ADD COLUMN IF NOT EXISTS facility_license_authority VARCHAR(100);
ALTER TABLE clinic_applications ADD COLUMN IF NOT EXISTS facility_license_issue_date DATE;
ALTER TABLE clinic_applications ADD COLUMN IF NOT EXISTS facility_license_expiry_date DATE;
ALTER TABLE clinic_applications ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) NOT NULL DEFAULT 'AE';
ALTER TABLE clinic_applications ADD COLUMN IF NOT EXISTS emirate VARCHAR(60);
ALTER TABLE clinic_applications ADD COLUMN IF NOT EXISTS city_area VARCHAR(160);
ALTER TABLE clinic_applications ADD COLUMN IF NOT EXISTS street_building TEXT;
ALTER TABLE clinic_applications ADD COLUMN IF NOT EXISTS office_unit VARCHAR(80);
ALTER TABLE clinic_applications ADD COLUMN IF NOT EXISTS po_box VARCHAR(40);
ALTER TABLE clinic_applications ADD COLUMN IF NOT EXISTS number_of_branches INTEGER;
ALTER TABLE clinic_applications ADD COLUMN IF NOT EXISTS authorized_representative_name VARCHAR(180);
ALTER TABLE clinic_applications ADD COLUMN IF NOT EXISTS representative_email VARCHAR(255);
ALTER TABLE clinic_applications ADD COLUMN IF NOT EXISTS representative_phone VARCHAR(40);
ALTER TABLE clinic_applications ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

UPDATE clinic_applications
SET application_reference = 'ONSTA-CL-' || upper(substr(replace(clinic_id, '-', ''), 1, 10))
WHERE application_reference IS NULL;
UPDATE clinic_applications SET application_status = status WHERE application_status = 'DRAFT' AND status <> 'DRAFT';
ALTER TABLE clinic_applications ALTER COLUMN application_reference SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_clinic_applications_reference ON clinic_applications(application_reference);
CREATE INDEX IF NOT EXISTS idx_clinic_applications_application_status_created ON clinic_applications(application_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinic_applications_invitation ON clinic_applications(invitation_id);
CREATE INDEX IF NOT EXISTS idx_clinic_invitations_status_created ON clinic_invitations(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinic_invitations_email ON clinic_invitations(lower(email));

CREATE TABLE IF NOT EXISTS clinic_application_documents (
  document_id VARCHAR(80) PRIMARY KEY,
  clinic_id VARCHAR(80) NOT NULL REFERENCES clinic_applications(clinic_id) ON DELETE CASCADE,
  document_type VARCHAR(60) NOT NULL REFERENCES document_types(code) ON DELETE RESTRICT,
  file_name VARCHAR(255) NOT NULL,
  storage_key TEXT NOT NULL,
  storage_backend VARCHAR(20) NOT NULL DEFAULT 'local',
  mime_type VARCHAR(120) NOT NULL,
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  scan_status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  verification_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  expiry_date DATE,
  uploaded_by VARCHAR(180),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_application_document_version UNIQUE(clinic_id, document_type, version)
);

CREATE INDEX IF NOT EXISTS idx_application_documents_clinic ON clinic_application_documents(clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_application_documents_expiry ON clinic_application_documents(expiry_date) WHERE expiry_date IS NOT NULL;

CREATE TABLE IF NOT EXISTS ai_scan_jobs (
  id VARCHAR(36) PRIMARY KEY,
  clinic_id VARCHAR(80) NOT NULL REFERENCES clinic_applications(clinic_id) ON DELETE CASCADE,
  provider VARCHAR(80) NOT NULL DEFAULT 'local',
  model_name VARCHAR(120),
  status VARCHAR(24) NOT NULL DEFAULT 'QUEUED',
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_scan_jobs_clinic_status ON ai_scan_jobs(clinic_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_extracted_fields (
  id VARCHAR(36) PRIMARY KEY,
  scan_job_id VARCHAR(36) NOT NULL REFERENCES ai_scan_jobs(id) ON DELETE CASCADE,
  document_id VARCHAR(80) REFERENCES clinic_application_documents(document_id) ON DELETE SET NULL,
  field_key VARCHAR(120) NOT NULL,
  extracted_value JSON,
  normalized_value JSON,
  confidence_score NUMERIC(5,4) CHECK (confidence_score IS NULL OR confidence_score BETWEEN 0 AND 1),
  source_page INTEGER CHECK (source_page IS NULL OR source_page > 0),
  review_status VARCHAR(24) NOT NULL DEFAULT 'NEEDS_REVIEW',
  confirmed_value JSON,
  reviewed_by VARCHAR(180),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ai_field_per_scan UNIQUE(scan_job_id, field_key)
);
CREATE INDEX IF NOT EXISTS idx_ai_fields_scan_review ON ai_extracted_fields(scan_job_id, review_status);

CREATE TABLE IF NOT EXISTS clinic_application_reviews (
  id VARCHAR(36) PRIMARY KEY,
  clinic_id VARCHAR(80) NOT NULL REFERENCES clinic_applications(clinic_id) ON DELETE CASCADE,
  reviewer VARCHAR(180),
  decision VARCHAR(32) NOT NULL,
  review_notes TEXT,
  rejection_category VARCHAR(100),
  rejection_reason TEXT,
  resubmission_allowed BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_application_reviews_clinic_created ON clinic_application_reviews(clinic_id, created_at DESC);

CREATE TABLE IF NOT EXISTS clinic_application_info_requests (
  id VARCHAR(36) PRIMARY KEY,
  clinic_id VARCHAR(80) NOT NULL REFERENCES clinic_applications(clinic_id) ON DELETE CASCADE,
  requested_by VARCHAR(180),
  requested_fields JSON NOT NULL DEFAULT '[]',
  request_message TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_application_info_requests_status ON clinic_application_info_requests(clinic_id, status, due_at);

COMMIT;
