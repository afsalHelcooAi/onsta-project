# ONSTA Standalone Clinic Platform

This Python API and the two React frontends use the full standalone PostgreSQL schema in `app/db/standalone_schema.sql`. The schema includes users and roles, clinic applications and documents, review history, clinic tenants and memberships, and clinic operations.

## First local setup

1. In pgAdmin, create a **new, empty** PostgreSQL database named `onsta_platform_db`.
2. Run `app/db/standalone_schema.sql` once against that database. Do not rerun the full schema on an existing database. Before deploying this version to an existing installation, back up the database and run `app/db/migrations/V003__restore_super_admin_only.sql` in pgAdmin.
3. Copy `.env.example` to `.env` and set the real database password, a long random `JWT_SECRET`, and the initial `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` (at least 12 characters).
4. From this folder, create a virtual environment, install `requirements.txt`, then seed the Super Admin and lookup rows:

   ```powershell
   python -m venv .venv
   .venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   python -m app.db.seed_initial_admin
   uvicorn app.main:app --reload --port 8000
   ```

   The seed creates the Super Admin and clinic-owner roles. Re-running it does not change an existing administrator's password. Platform administration is Super-Admin-only; use the **All Users** page for the read-only directory of platform and clinic accounts.

   Document analysis also needs the **Tesseract OCR application** installed on Windows (the Python package alone is not enough). Install Tesseract OCR and English language data, then set `TESSERACT_CMD` in `.env` to its executable path if it is not on `PATH` (commonly `C:\Program Files\Tesseract-OCR\tesseract.exe`). Set `TESSERACT_LANGS=eng+ara` only when Arabic language data is installed. PDF text is read directly when available; scanned PDFs and images are processed with Tesseract. If Tesseract is unavailable, document analysis returns an error and does not create a clinic account.

5. In separate terminals, run `npm install` and `npm run dev` in `onsta-admin` and `onsta-clinic`.

## Initial user flow

- Super Admin signs in at `http://localhost:3001` using the seeded account.
- A clinic registers at `http://localhost:3000/register` through a guided three-step upload for the trade license, healthcare facility license, and healthcare advertising permit. Each step explains the document and the information OCR will look for. The clinic reviews/corrects extracted values, creates its login, and submits the application.
- The API stores the application as `SUBMITTED`. The clinic user can sign in at `http://localhost:3000/login` and see its pending status; the clinic dashboard remains locked.
- The Super Admin reviews the stored application and documents, then approves, rejects, or requests more information.
- Approval creates the clinic tenant and owner membership. On the clinic user's next sign-in, the API resolves the membership and opens the clinic dashboard.

The sign-in screens do not ask users to pick a role. The API resolves the workspace from role and clinic membership records.

## Existing platform-admin installations

`V003__restore_super_admin_only.sql` removes pending platform-admin invitations, platform role assignments other than `SUPER_ADMIN`, the corresponding extra platform roles, and the feature-specific `platform.*` permission records. It does **not** delete user accounts or clinic memberships. Users who only had an additional platform role remain in the users table but lose platform access; they are not promoted to Super Admin. The migration is intentionally data-affecting and cannot restore deleted invitations or assignments on rollback. Back up the database first. The migration has not been applied automatically.

## Existing starter database

`onsta_clinic_db` is the earlier three-table starter database and does not use the full standalone schema. Keep it as a backup or for the old prototype. Do not run `app/db/step4_onboarding.sql` against `onsta_platform_db`; that script targets the old starter layout. The new app does not call SQLAlchemy `create_all` at startup because the full schema is installed explicitly.

## Local security notes

The initial auth uses signed bearer tokens and scrypt password hashes. Keep `.env` private and use a strong JWT secret and administrator password. Super-Admin access is enforced by the API, suspended accounts lose access on their next request, and account changes are written to `audit_logs`. Local uploads are stored under `uploads/applications`; use private object storage and HTTPS before deploying. Automated email delivery, rate limiting, and production-grade secret management still need to be configured before public launch.
