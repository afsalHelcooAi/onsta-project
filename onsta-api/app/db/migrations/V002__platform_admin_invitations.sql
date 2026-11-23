BEGIN;

CREATE TABLE IF NOT EXISTS platform_admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  email_normalized VARCHAR(255) GENERATED ALWAYS AS (lower(trim(email))) STORED,
  full_name VARCHAR(180) NOT NULL,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  token_hash CHAR(64) NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  accepted_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (accepted_at IS NULL OR revoked_at IS NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_admin_invites_pending_email
  ON platform_admin_invitations(email_normalized)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

COMMIT;
