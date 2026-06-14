<<<<<<< HEAD
# gastro-registry
A clinical workflow and registry platform for gastroenterology and hepatology specialists, enabling referral coordination, patient tracking, endoscopy reporting, and disease registries across multiple healthcare facilities.
=======
# 🏥 Gastro Referral & Registry System

A production-ready clinical workflow platform for **gastroenterology and hepatology specialists in Ghana**. Built for real-world use in Ghanaian clinics.

---

## 🗺 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER / MOBILE                         │
│                     Next.js 14  (port 3000)                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP / REST (JWT)
┌─────────────────────────▼───────────────────────────────────────┐
│                    FastAPI Backend (port 8000)                   │
│   Auth · Patients · Referrals · Doctor · Follow-ups · Analytics │
│                    Rule-based Triage Engine                      │
└─────────────────────────┬───────────────────────────────────────┘
                          │ SQLAlchemy ORM
┌─────────────────────────▼───────────────────────────────────────┐
│                 PostgreSQL 16  (port 5432)                       │
│   users · patients · referrals · consultations · followups      │
└─────────────────────────────────────────────────────────────────┘
```

**Stack:**
| Layer    | Technology |
|----------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend  | Python 3.11, FastAPI, SQLAlchemy 2, Alembic |
| Database | PostgreSQL 16 |
| Auth     | JWT (python-jose), bcrypt password hashing |
| DevOps   | Docker, Docker Compose |

---

## 🚀 Quick Start (One Command)

```bash
# 1. Clone / unzip the project
cd gastro-referral-system

# 2. Copy environment files
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env

# 3. Build and start everything
docker-compose up --build

# App will be available at:
#   Frontend  →  http://localhost:3000
#   Backend   →  http://localhost:8000
#   API Docs  →  http://localhost:8000/docs
```

The database is **auto-migrated** and **seeded** on first boot.

---

## 🔑 Demo Credentials

| Role   | Email                 | Password   | Redirects to         |
|--------|-----------------------|------------|----------------------|
| Admin  | admin@gastro.gh       | admin123   | /admin/dashboard     |
| Doctor | doctor@gastro.gh      | doctor123  | /doctor/dashboard    |
| Nurse  | nurse@gastro.gh       | nurse123   | /nurse/intake        |

---

## 📁 Project Structure

```
gastro-referral-system/
│
├── frontend/                    # Next.js 14 App Router
│   ├── app/
│   │   ├── auth/login/          # Login page
│   │   ├── nurse/
│   │   │   ├── intake/          # Patient intake + referral form
│   │   │   └── triage-result/   # Triage outcome display
│   │   ├── doctor/
│   │   │   ├── dashboard/       # Referrals list + filters
│   │   │   └── referral/[id]/   # Referral detail + consultation form
│   │   ├── admin/
│   │   │   └── dashboard/       # Analytics dashboard (charts)
│   │   └── patient/[id]/        # Full patient record
│   ├── components/              # Shared UI components
│   ├── lib/                     # API client, auth utils
│   └── types/                   # TypeScript interfaces
│
├── backend/                     # FastAPI application
│   └── app/
│       ├── core/
│       │   ├── config.py        # Settings (pydantic-settings)
│       │   ├── security.py      # JWT, bcrypt, RBAC
│       │   └── triage.py        # Rule-based triage engine ⭐
│       ├── models/              # SQLAlchemy ORM models
│       ├── routers/             # API route handlers
│       ├── schemas.py           # Pydantic request/response schemas
│       ├── database.py          # DB session + Base
│       ├── seed.py              # Demo user seeding
│       └── main.py              # FastAPI app + lifespan
│
├── database/
│   └── init.sql                 # Schema, indexes, triggers, seed patients
│
├── docker-compose.yml           # Full stack orchestration
└── README.md
```

---

## 🧠 Triage Engine (Rule-Based)

Located at `backend/app/core/triage.py`. Classifies each referral automatically:

| Symptom | Risk Level |
|---------|-----------|
| Vomiting blood (haematemesis) | 🔴 HIGH |
| Black/tarry stool (melaena) | 🔴 HIGH |
| Jaundice | 🔴 HIGH |
| Rectal bleeding | 🔴 HIGH |
| Abdominal pain | 🟡 MEDIUM |
| Dysphagia | 🟡 MEDIUM |
| Chronic diarrhoea | 🟡 MEDIUM |
| Weight loss | 🟡 MEDIUM |
| Mild nausea, bloating, heartburn | 🟢 LOW |

Critical vitals (BP < 90 systolic, HR > 120 bpm, SpO₂ < 94%) automatically escalate to **HIGH**.

---

## 🌐 API Reference

Interactive Swagger docs: `http://localhost:8000/docs`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Get JWT token |
| GET | `/auth/me` | Current user |
| POST | `/patients/create` | Register patient |
| GET | `/patients/` | Search patients |
| GET | `/patients/{id}` | Patient detail |
| POST | `/referrals/create` | Create referral (triggers triage) |
| GET | `/referrals/list` | List referrals (filterable) |
| GET | `/referrals/{id}` | Referral detail |
| PUT | `/referrals/{id}` | Update referral status |
| GET | `/doctor/referrals` | Doctor's referral queue |
| POST | `/doctor/update-case` | Add consultation |
| POST | `/followups/create` | Schedule follow-up |
| GET | `/followups/` | List follow-ups |
| GET | `/analytics/summary` | Dashboard analytics |

---

## 🛠 Local Development (Without Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env           # Edit DATABASE_URL to point to local Postgres
python run.py
# API at http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install --legacy-peer-deps
cp .env.example .env.local
npm run dev
# App at http://localhost:3000
```

### Database (local Postgres)

```bash
psql -U postgres -c "CREATE DATABASE gastro_db;"
psql -U postgres -c "CREATE USER gastro_user WITH PASSWORD 'gastro_pass';"
psql -U postgres -c "GRANT ALL ON DATABASE gastro_db TO gastro_user;"
psql -U gastro_user -d gastro_db -f database/init.sql
```

---

## 🔒 Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| `SECRET_KEY` | — | JWT signing key (≥32 chars) |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` | Session duration (8h) |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed frontend origins |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API URL |

---

## 🐳 Docker Commands

```bash
# Start everything
docker-compose up --build

# Run in background
docker-compose up -d --build

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop everything
docker-compose down

# Stop and remove volumes (resets database)
docker-compose down -v

# Rebuild a single service
docker-compose up -d --build backend
```

---

## 📋 Clinical Workflow

```
Nurse logs in
    │
    ▼
/nurse/intake
    │  Registers patient (name, age, sex, vitals)
    │  Selects symptoms from checklist
    │  Submits referral
    │
    ▼
Triage Engine (backend)
    │  Evaluates symptom severity
    │  Assigns HIGH / MEDIUM / LOW risk
    │
    ▼
/nurse/triage-result
    │  Shows risk classification
    │  Recommends urgency level
    │
    ▼
Doctor logs in → /doctor/dashboard
    │  Sees all incoming referrals
    │  Filters by status / risk
    │  Clicks referral to review
    │
    ▼
/doctor/referral/[id]
    │  Reviews symptoms, vitals, patient history
    │  Adds consultation (diagnosis, plan, outcome)
    │  Schedules follow-up if needed
    │
    ▼
/admin/dashboard
    Visualises referral volumes, risk distribution,
    status breakdown, upcoming follow-ups
```

---

## 🩺 About

Built for Ghana's gastroenterology and hepatology clinical workflow. Designed to be:
- **Fast** — minimal typing, checklist-driven UI
- **Role-aware** — nurses, doctors, and admins see different views
- **Triage-first** — every referral is automatically risk-stratified
- **Scalable** — containerised, production-grade architecture
>>>>>>> b90cd7a (chore: initial full repo push)
