-- ONSTA standalone clinic partner platform
-- Target: a NEW, empty PostgreSQL database (PostgreSQL 15+ recommended).
-- This creates the schema only; it does not seed users or sample data.
-- Do not run against a database containing the earlier starter tables without a migration plan.

BEGIN;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  email_normalized VARCHAR(255) GENERATED ALWAYS AS (lower(trim(email))) STORED,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(180) NOT NULL,
  phone VARCHAR(32),
  status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('INVITED','ACTIVE','SUSPENDED','DISABLED')),
  email_verified_at TIMESTAMPTZ,
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_users_email_normalized UNIQUE(email_normalized)
);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) NOT NULL,
  scope VARCHAR(20) NOT NULL CHECK (scope IN ('PLATFORM','CLINIC')),
  description TEXT,
  CONSTRAINT uq_roles_name_scope UNIQUE(name, scope)
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key VARCHAR(120) NOT NULL UNIQUE,
  description TEXT NOT NULL
);

CREATE TABLE role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY(role_id, permission_id)
);

-- Platform-wide assignments (Super Admin, Verification Officer, Sales, etc.).
CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, role_id)
);

CREATE TABLE sales_representatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  employee_code VARCHAR(40) UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE referral_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name VARCHAR(180) NOT NULL,
  contact_name VARCHAR(180),
  email VARCHAR(255),
  phone VARCHAR(32),
  referral_code VARCHAR(60) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE clinic_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_name VARCHAR(200) NOT NULL,
  contact_name VARCHAR(180),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(32),
  emirate VARCHAR(60),
  facility_type VARCHAR(100),
  source VARCHAR(32) NOT NULL CHECK (source IN ('EMAIL','WHATSAPP','QR_CODE','SALES','PARTNER_REFERRAL','PUBLIC_PAGE')),
  sales_representative_id UUID REFERENCES sales_representatives(id) ON DELETE SET NULL,
  referral_partner_id UUID REFERENCES referral_partners(id) ON DELETE SET NULL,
  token_hash TEXT UNIQUE,
  status VARCHAR(24) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SENT','ACCEPTED','EXPIRED','REVOKED')),
  expires_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE clinic_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_reference VARCHAR(40) NOT NULL UNIQUE,
  invitation_id UUID REFERENCES clinic_invitations(id) ON DELETE SET NULL,
  submitted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'PUBLIC_PAGE'
    CHECK (source IN ('EMAIL','WHATSAPP','QR_CODE','SALES','PARTNER_REFERRAL','PUBLIC_PAGE')),
  sales_representative_id UUID REFERENCES sales_representatives(id) ON DELETE SET NULL,
  referral_partner_id UUID REFERENCES referral_partners(id) ON DELETE SET NULL,
  legal_entity_name VARCHAR(220) NOT NULL,
  trading_name VARCHAR(220) NOT NULL,
  company_registration_number VARCHAR(100),
  facility_type VARCHAR(100) NOT NULL,
  trade_license_number VARCHAR(100),
  trade_license_authority VARCHAR(100),
  trade_license_issue_date DATE,
  trade_license_expiry_date DATE,
  facility_license_number VARCHAR(100),
  facility_license_authority VARCHAR(100),
  facility_license_issue_date DATE,
  facility_license_expiry_date DATE,
  number_of_branches INTEGER CHECK (number_of_branches IS NULL OR number_of_branches >= 1),
  year_established SMALLINT CHECK (year_established IS NULL OR year_established BETWEEN 1800 AND 2200),
  official_email VARCHAR(255) NOT NULL,
  main_phone VARCHAR(32) NOT NULL,
  website TEXT,
  contact_person_name VARCHAR(180) NOT NULL,
  contact_person_title VARCHAR(120),
  authorized_representative_name VARCHAR(180),
  representative_email VARCHAR(255),
  representative_phone VARCHAR(32),
  country_code CHAR(2) NOT NULL DEFAULT 'AE',
  emirate VARCHAR(60) NOT NULL,
  city_area VARCHAR(160) NOT NULL,
  street_building TEXT NOT NULL,
  office_unit VARCHAR(80),
  po_box VARCHAR(40),
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  application_status VARCHAR(32) NOT NULL DEFAULT 'DRAFT'
    CHECK (application_status IN ('DRAFT','IN_PROGRESS','DOCUMENTS_PENDING','SCANNING','READY_FOR_REVIEW','SUBMITTED','UNDER_REVIEW','ADDITIONAL_INFO_REQUESTED','APPROVED','REJECTED')),
  assigned_reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  priority VARCHAR(16) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(60) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  scope VARCHAR(24) NOT NULL CHECK (scope IN ('APPLICATION','BRANCH','PRACTITIONER','CLINIC')),
  allowed_mime_types TEXT[] NOT NULL DEFAULT ARRAY['application/pdf','image/jpeg','image/png'],
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE facility_document_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emirate VARCHAR(60) NOT NULL,
  authority VARCHAR(100) NOT NULL,
  facility_type VARCHAR(100) NOT NULL,
  document_type_id UUID NOT NULL REFERENCES document_types(id) ON DELETE RESTRICT,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_requirement_dates CHECK (valid_until IS NULL OR valid_until >= valid_from),
  CONSTRAINT uq_facility_document_requirement UNIQUE(emirate, authority, facility_type, document_type_id, version)
);

CREATE TABLE clinic_application_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES clinic_applications(id) ON DELETE CASCADE,
  document_type_id UUID NOT NULL REFERENCES document_types(id) ON DELETE RESTRICT,
  original_file_name VARCHAR(255) NOT NULL,
  storage_key TEXT NOT NULL,
  storage_backend VARCHAR(16) NOT NULL DEFAULT 'LOCAL' CHECK (storage_backend IN ('LOCAL','S3')),
  mime_type VARCHAR(120) NOT NULL,
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  scan_status VARCHAR(24) NOT NULL DEFAULT 'PENDING' CHECK (scan_status IN ('PENDING','PROCESSING','COMPLETED','FAILED')),
  verification_status VARCHAR(24) NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING','VERIFIED','FLAGGED','REJECTED')),
  expiry_date DATE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(application_id, document_type_id, version)
);

CREATE TABLE ai_scan_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES clinic_applications(id) ON DELETE CASCADE,
  provider VARCHAR(80) NOT NULL,
  model_name VARCHAR(120),
  status VARCHAR(24) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','PROCESSING','COMPLETED','FAILED')),
  external_job_id VARCHAR(180),
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai_extracted_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_job_id UUID NOT NULL REFERENCES ai_scan_jobs(id) ON DELETE CASCADE,
  document_id UUID REFERENCES clinic_application_documents(id) ON DELETE SET NULL,
  field_key VARCHAR(120) NOT NULL,
  extracted_value JSONB,
  normalized_value JSONB,
  confidence_score NUMERIC(5,4) CHECK (confidence_score IS NULL OR confidence_score BETWEEN 0 AND 1),
  source_page INTEGER CHECK (source_page IS NULL OR source_page > 0),
  review_status VARCHAR(24) NOT NULL DEFAULT 'NEEDS_REVIEW' CHECK (review_status IN ('NEEDS_REVIEW','CONFIRMED','CORRECTED','REJECTED')),
  confirmed_value JSONB,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(scan_job_id, document_id, field_key)
);

CREATE TABLE clinic_application_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES clinic_applications(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  decision VARCHAR(32) NOT NULL CHECK (decision IN ('STARTED','REQUESTED_INFO','APPROVED','REJECTED')),
  review_notes TEXT,
  rejection_category VARCHAR(100),
  rejection_reason TEXT,
  resubmission_allowed BOOLEAN,
  resubmission_due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE clinic_application_info_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES clinic_applications(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  requested_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  request_message TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ANSWERED','CLOSED')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE clinic_application_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES clinic_applications(id) ON DELETE CASCADE,
  old_status VARCHAR(32),
  new_status VARCHAR(32) NOT NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A tenant is created only after human approval. Account/tenant status is independent from application status.
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(220) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'PENDING_ACTIVATION' CHECK (status IN ('PENDING_ACTIVATION','ACTIVE','SUSPENDED','INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ
);

CREATE TABLE clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE RESTRICT,
  approved_application_id UUID NOT NULL UNIQUE REFERENCES clinic_applications(id) ON DELETE RESTRICT,
  legal_name VARCHAR(220) NOT NULL,
  trading_name VARCHAR(220) NOT NULL,
  facility_type VARCHAR(100) NOT NULL,
  primary_email VARCHAR(255) NOT NULL,
  primary_phone VARCHAR(32) NOT NULL,
  public_description TEXT,
  logo_storage_key TEXT,
  verification_status VARCHAR(28) NOT NULL DEFAULT 'VERIFIED' CHECK (verification_status IN ('PENDING_VERIFICATION','VERIFIED','RE_VERIFICATION_REQUIRED')),
  visibility_status VARCHAR(16) NOT NULL DEFAULT 'DRAFT' CHECK (visibility_status IN ('DRAFT','PUBLISHED','HIDDEN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, id)
);

CREATE TABLE clinic_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('INVITED','ACTIVE','SUSPENDED','REVOKED')),
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

CREATE TABLE clinic_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  branch_code VARCHAR(40),
  branch_name VARCHAR(180) NOT NULL,
  emirate VARCHAR(60) NOT NULL,
  area VARCHAR(160),
  street_address TEXT NOT NULL,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  phone VARCHAR(32),
  email VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, id),
  UNIQUE(clinic_id, branch_code),
  FOREIGN KEY (tenant_id, clinic_id) REFERENCES clinics(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE clinic_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID,
  document_type_id UUID NOT NULL REFERENCES document_types(id) ON DELETE RESTRICT,
  original_file_name VARCHAR(255) NOT NULL,
  storage_key TEXT NOT NULL,
  storage_backend VARCHAR(16) NOT NULL DEFAULT 'LOCAL' CHECK (storage_backend IN ('LOCAL','S3')),
  mime_type VARCHAR(120) NOT NULL,
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  verification_status VARCHAR(24) NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING','VERIFIED','FLAGGED','REJECTED','EXPIRED')),
  expiry_date DATE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, branch_id) REFERENCES clinic_branches(tenant_id, id)
);

CREATE TABLE specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE clinic_specialties (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  specialty_id UUID NOT NULL REFERENCES specialties(id) ON DELETE RESTRICT,
  PRIMARY KEY(clinic_id, specialty_id),
  FOREIGN KEY (tenant_id, clinic_id) REFERENCES clinics(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE practitioners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  full_name VARCHAR(180) NOT NULL,
  professional_title VARCHAR(120) NOT NULL,
  gender VARCHAR(24),
  biography TEXT,
  profile_image_storage_key TEXT,
  years_experience SMALLINT CHECK (years_experience IS NULL OR years_experience >= 0),
  languages TEXT[] NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','SUSPENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, id),
  FOREIGN KEY (tenant_id, clinic_id) REFERENCES clinics(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE practitioner_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  authority VARCHAR(100) NOT NULL,
  license_number VARCHAR(100) NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  verification_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING','VERIFIED','REJECTED','EXPIRED')),
  document_id UUID REFERENCES clinic_documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, authority, license_number),
  FOREIGN KEY (tenant_id, practitioner_id) REFERENCES practitioners(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE practitioner_specialties (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  specialty_id UUID NOT NULL REFERENCES specialties(id) ON DELETE RESTRICT,
  PRIMARY KEY(practitioner_id, specialty_id),
  FOREIGN KEY (tenant_id, practitioner_id) REFERENCES practitioners(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  specialty_id UUID REFERENCES specialties(id) ON DELETE SET NULL,
  name VARCHAR(180) NOT NULL,
  description TEXT,
  price NUMERIC(10,2) CHECK (price IS NULL OR price >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'AED',
  duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE','INACTIVE')),
  visibility_status VARCHAR(16) NOT NULL DEFAULT 'HIDDEN' CHECK (visibility_status IN ('HIDDEN','PUBLISHED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, id),
  FOREIGN KEY (tenant_id, clinic_id) REFERENCES clinics(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE branch_services (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY(branch_id, service_id),
  FOREIGN KEY (tenant_id, branch_id) REFERENCES clinic_branches(tenant_id, id),
  FOREIGN KEY (tenant_id, service_id) REFERENCES services(tenant_id, id)
);

CREATE TABLE practitioner_services (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY(practitioner_id, service_id),
  FOREIGN KEY (tenant_id, practitioner_id) REFERENCES practitioners(tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, service_id) REFERENCES services(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE practitioner_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (end_time > start_time),
  FOREIGN KEY (tenant_id, branch_id) REFERENCES clinic_branches(tenant_id, id),
  FOREIGN KEY (tenant_id, practitioner_id) REFERENCES practitioners(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE branch_operating_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  opens_at TIME,
  closes_at TIME,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (is_closed OR (opens_at IS NOT NULL AND closes_at > opens_at)),
  FOREIGN KEY (tenant_id, branch_id) REFERENCES clinic_branches(tenant_id, id),
  UNIQUE(branch_id, weekday)
);

-- Minimal enquiry/appointment records. Keep sensitive clinical records out of this platform.
CREATE TABLE customer_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  branch_id UUID,
  customer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_name VARCHAR(180) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(32),
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  preferred_practitioner_id UUID REFERENCES practitioners(id) ON DELETE SET NULL,
  message TEXT,
  status VARCHAR(24) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW','PENDING','ACCEPTED','REJECTED','CONVERTED','CLOSED')),
  consent_recorded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, branch_id) REFERENCES clinic_branches(tenant_id, id),
  FOREIGN KEY (tenant_id, clinic_id) REFERENCES clinics(tenant_id, id),
  FOREIGN KEY (tenant_id, service_id) REFERENCES services(tenant_id, id),
  FOREIGN KEY (tenant_id, preferred_practitioner_id) REFERENCES practitioners(tenant_id, id)
);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  branch_id UUID,
  enquiry_id UUID REFERENCES customer_enquiries(id) ON DELETE SET NULL,
  customer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_name VARCHAR(180) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(32),
  practitioner_id UUID REFERENCES practitioners(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(28) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','CONFIRMED','RESCHEDULE_REQUESTED','COMPLETED','CANCELLED','REJECTED')),
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  FOREIGN KEY (tenant_id, branch_id) REFERENCES clinic_branches(tenant_id, id),
  FOREIGN KEY (tenant_id, clinic_id) REFERENCES clinics(tenant_id, id),
  FOREIGN KEY (tenant_id, practitioner_id) REFERENCES practitioners(tenant_id, id),
  FOREIGN KEY (tenant_id, service_id) REFERENCES services(tenant_id, id)
);

CREATE TABLE appointment_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  old_status VARCHAR(28),
  new_status VARCHAR(28) NOT NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'AED',
  billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('MONTHLY','YEARLY','TRIAL')),
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'TRIAL' CHECK (status IN ('TRIAL','ACTIVE','PAST_DUE','CANCELLED','EXPIRED')),
  starts_at DATE,
  ends_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('EMAIL','WHATSAPP','IN_APP')),
  template_key VARCHAR(100),
  recipient VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','SENT','FAILED','DELIVERED')),
  provider_message_id VARCHAR(180),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Query indexes for admin review queues, clinic tenant views, expiries, and audit trails.
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_user_roles_role ON user_roles(role_id, user_id);
CREATE INDEX idx_clinic_memberships_user_status ON clinic_memberships(user_id, status);
CREATE INDEX idx_clinic_memberships_tenant_status ON clinic_memberships(tenant_id, status);
CREATE INDEX idx_invitations_status_created ON clinic_invitations(status, created_at DESC);
CREATE INDEX idx_invitations_email ON clinic_invitations(lower(email));
CREATE INDEX idx_invitations_sales_rep ON clinic_invitations(sales_representative_id, created_at DESC);
CREATE INDEX idx_invitations_referral_partner ON clinic_invitations(referral_partner_id, created_at DESC);
CREATE INDEX idx_applications_status_created ON clinic_applications(application_status, created_at DESC);
CREATE INDEX idx_applications_reviewer_status ON clinic_applications(assigned_reviewer_id, application_status);
CREATE INDEX idx_applications_source_created ON clinic_applications(source, created_at DESC);
CREATE INDEX idx_applications_emirate_status ON clinic_applications(emirate, application_status);
CREATE INDEX idx_applications_license_expiry ON clinic_applications(trade_license_expiry_date, facility_license_expiry_date);
CREATE INDEX idx_application_documents_application_type ON clinic_application_documents(application_id, document_type_id);
CREATE INDEX idx_application_documents_expiry ON clinic_application_documents(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_ai_scan_jobs_application_status ON ai_scan_jobs(application_id, status, created_at DESC);
CREATE INDEX idx_ai_extracted_fields_job_review ON ai_extracted_fields(scan_job_id, review_status);
CREATE INDEX idx_reviews_application_created ON clinic_application_reviews(application_id, created_at DESC);
CREATE INDEX idx_info_requests_application_status ON clinic_application_info_requests(application_id, status, due_at);
CREATE INDEX idx_application_history_application_created ON clinic_application_history(application_id, created_at DESC);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_clinics_visibility ON clinics(visibility_status, verification_status);
CREATE INDEX idx_branches_tenant_status ON clinic_branches(tenant_id, status);
CREATE INDEX idx_clinic_documents_tenant_type ON clinic_documents(tenant_id, document_type_id);
CREATE INDEX idx_clinic_documents_expiry ON clinic_documents(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_practitioners_tenant_status ON practitioners(tenant_id, status);
CREATE INDEX idx_practitioner_licenses_expiry ON practitioner_licenses(tenant_id, expiry_date);
CREATE INDEX idx_services_tenant_status ON services(tenant_id, status, visibility_status);
CREATE INDEX idx_enquiries_tenant_status_created ON customer_enquiries(tenant_id, status, created_at DESC);
CREATE INDEX idx_appointments_tenant_start ON appointments(tenant_id, starts_at);
CREATE INDEX idx_appointments_tenant_status_start ON appointments(tenant_id, status, starts_at);
CREATE INDEX idx_appointments_customer ON appointments(customer_user_id, starts_at DESC) WHERE customer_user_id IS NOT NULL;
CREATE INDEX idx_appointment_history_appointment_created ON appointment_status_history(appointment_id, created_at DESC);
CREATE INDEX idx_subscriptions_tenant_status ON subscriptions(tenant_id, status);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_status_created ON notifications(status, created_at);
CREATE INDEX idx_audit_logs_actor_created ON audit_logs(actor_user_id, created_at DESC);
CREATE INDEX idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);

COMMIT;
