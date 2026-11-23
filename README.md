# ONSTA Healthcare Platform — Monorepo

Welcome to the **ONSTA** monorepo. This repository contains the complete platform architecture designed for multi-developer collaboration across three unified services sharing a common design system, database, and backend API.

---

## 🏛 Architecture & Team Ownership

```
onsta-project/
├── onsta-clinic/    → Port 3000 (Owner: Clinic Portal Lead)
│   └── Clinic registration wizard, 3-doc AI ingestion, doctors, services, offers, leads, compliance.
│
├── onsta-admin/     → Port 3001 (Owner: Software Admin Lead)
│   └── Admin operations, clinic review queue, approved clinic directory, and all-users directory.
│
├── onsta-api/       → Port 8000 (Shared Backend)
│   └── FastAPI server, state machine, AI document parser (Gemini 2.0 Flash), PostgreSQL / Redis.
│
└── docker-compose.yml → Optional one-command Postgres (5432) & Redis (6379)
```

---

## 🚀 Quick Start Guide

### 1. Backend (`onsta-api`) — Port 8000
```bash
cd onsta-api
# Create and activate python virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure .env from .env.example, create an empty onsta_platform_db,
# and run app/db/standalone_schema.sql against it once in pgAdmin.
# Then create the initial admin and lookup rows:
python -m app.db.seed_initial_admin

# Run the FastAPI server
uvicorn app.main:app --reload --port 8000
```
- API Docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/v1/health`

### 2. Clinic Partner Portal (`onsta-clinic`) — Port 3000
```bash
cd onsta-clinic
npm install
npm run dev
```
- Portal URL: `http://localhost:3000`
- Fast AI Onboarding: `http://localhost:3000/register`

### 3. Software Admin Dashboard (`onsta-admin`) — Port 3001
```bash
cd onsta-admin
npm install
npm run dev
```
- Admin Queue: `http://localhost:3001`

---

## 🔄 Initial Login & Clinic Registration
1. A Super Admin signs in at `http://localhost:3001` using the account configured in `onsta-api/.env` and seeded by `python -m app.db.seed_initial_admin`.
2. A clinic registers at `http://localhost:3000/register`, creates its account, enters clinic details, and uploads the trade license, facility license, and advertising permit.
3. The API stores the application as `SUBMITTED`. The clinic can sign in at `http://localhost:3000/login` to see its status; its operational dashboard remains locked.
4. The Super Admin reviews the submitted clinic and documents in the review queue, then approves, rejects, or requests more information.
5. Approval creates the clinic tenant and owner membership. On the clinic user's next sign-in, the API recognizes its membership and opens the Clinic Dashboard.
6. The **All Users** directory lists platform and clinic accounts, with filters for account type, status, role, and clinic. Platform administration remains Super-Admin-only.

The role is resolved by the API from the account's assignments; neither sign-in form asks the user to choose a role. See [onsta-api/README.md](onsta-api/README.md) for database and setup details. Do not run `onsta-api/app/db/step4_onboarding.sql` against the new full schema; it is only for the older starter database.

---

## 🌿 Git Collaboration Workflow
- Main branch: `main`
- Developer 1 (Clinic Portal): work in branch `feature/clinic-portal`
- Developer 2 (Admin Portal): work in branch `feature/admin-dashboard`
- Shared Backend changes: coordinate on `onsta-api`
