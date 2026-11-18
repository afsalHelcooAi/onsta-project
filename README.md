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
│   └── Admin operations, compliance review queue, 1-click clinic verification, audit trail.
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

## 🔄 End-to-End Inter-Module Workflow
1. A clinic registers at `http://localhost:3000/register`, uploads 3 licenses (Trade License, Facility License, MOHAP Permit).
2. Gemini 2.0 Flash extracts all details in sub-2s and fills the 5-tab registration form.
3. On "Review & Submit", the clinic state transitions to `UNDER_REVIEW`. The clinic dashboard shows "Application Submitted — Pending Admin Approval".
4. The colleague opens `http://localhost:3001` (Admin Portal), inspects the documents, and clicks **"Approve & Unlock Dashboard"**.
5. The status updates in the shared backend to `APPROVED`. The clinic dashboard immediately unlocks!

---

## 🌿 Git Collaboration Workflow
- Main branch: `main`
- Developer 1 (Clinic Portal): work in branch `feature/clinic-portal`
- Developer 2 (Admin Portal): work in branch `feature/admin-dashboard`
- Shared Backend changes: coordinate on `onsta-api`
