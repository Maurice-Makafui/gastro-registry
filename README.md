# 🏥 Gastro Referral & Registry System

A production-ready clinical workflow platform for **gastroenterology and hepatology specialists in Ghana**.

---

## 🗺 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER / MOBILE                         │
│               Next.js 14 — Vercel  (port 3000)                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP / REST (JWT)
┌─────────────────────────▼───────────────────────────────────────┐
│              FastAPI Backend — Render  (port 8000)              │
│   Auth · Patients · Referrals · Doctor · Follow-ups · Analytics │
│                    Rule-based Triage Engine                      │
└─────────────────────────┬───────────────────────────────────────┘
                          │ SQLAlchemy ORM (psycopg v3)
┌─────────────────────────▼───────────────────────────────────────┐
│            Supabase PostgreSQL  (port 5432)                     │
│   users · patients · referrals · consultations · followups      │
└─────────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    Supabase Storage                             │
│              Endoscopy images · PDF reports                     │
└─────────────────────────────────────────────────────────────────┘
```

**Stack:**

| Layer    | Technology |
|----------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS — **Vercel** |
| Backend  | Python 3.11, FastAPI, SQLAlchemy 2, Alembic — **Render** |
| Database | Supabase PostgreSQL |
| Storage  | Supabase Storage |
| Auth     | JWT (python-jose), bcrypt password hashing |

---

## 🚀 Quick Start (Docker — Local)

```bash
cd gastro-referral-system
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
docker-compose up --build
# Frontend → http://localhost:3000
# Backend  → http://localhost:8000
# API Docs → http://localhost:8000/docs
```

---

## 🔑 Demo Credentials

| Role   | Email            | Password  |
|--------|------------------|-----------|
| Admin  | admin@gastro.gh  | admin123  |
| Doctor | doctor@gastro.gh | doctor123 |
| Nurse  | nurse@gastro.gh  | nurse123  |

---

## 🛠 Local Development

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env           # fill in DATABASE_URL pointing to local/Supabase Postgres
uvicorn app.main:app --reload
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

### Database Migration

```bash
cd backend
alembic upgrade head
```

---

## 🚢 Production Deployment

### Deploy Frontend — Vercel

1. Push repo to GitHub.
2. Import project in [Vercel](https://vercel.com/new).
3. Set **Root Directory** to `frontend`.
4. Add environment variables from `frontend/.env.example`.
5. Deploy — Vercel auto-deploys on every push to `main`.

### Deploy Backend — Render

1. Push repo to GitHub.
2. Create a new **Web Service** in [Render](https://render.com), or connect via `render.yaml`.
3. Set **Root Directory** to `backend`.
4. Add all environment variables from `backend/.env.example`.
5. Render auto-deploys on every push to `main` (`autoDeploy: true`).
6. Health check endpoint: `GET /health`

### Database — Supabase PostgreSQL

1. Create a project at [supabase.com](https://supabase.com).
2. Copy the **Session Mode** connection string (port `5432`) into `DATABASE_URL`:
   ```
   DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/postgres
   ```
3. Run migrations against Supabase:
   ```bash
   cd backend
   alembic upgrade head
   ```

### File Storage — Supabase Storage

1. Create buckets (e.g. `endoscopy-images`, `reports`) in the Supabase dashboard.
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in backend env vars.
3. Use `app/services/storage_service.py` — `upload_image()`, `upload_pdf()`, `delete_file()`.

---

## 🔒 Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | `postgresql+psycopg://USER:PASSWORD@HOST:PORT/postgres` |
| `SECRET_KEY` | JWT signing key (≥ 32 chars) |
| `ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Session duration (default `60`) |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `FRONTEND_URL` | Production Vercel URL |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Render backend URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |

---

## 🧠 Triage Engine

Located at `backend/app/core/triage.py`. Auto-classifies every referral:

| Symptom | Risk |
|---------|------|
| Haematemesis, Melaena, Jaundice, Rectal bleeding | 🔴 HIGH |
| Abdominal pain, Dysphagia, Chronic diarrhoea, Weight loss | 🟡 MEDIUM |
| Nausea, Bloating, Heartburn | 🟢 LOW |

Critical vitals (BP < 90 systolic, HR > 120 bpm, SpO₂ < 94%) auto-escalate to HIGH.

---

## 📋 Clinical Workflow

```
Nurse → /nurse/intake → Triage Engine → /nurse/triage-result
Doctor → /doctor/dashboard → /doctor/referral/[id] → Consultation
Admin  → /admin/dashboard → Analytics
```

---

## 🐳 Docker Commands

```bash
docker-compose up --build          # start all services
docker-compose up -d --build       # background
docker-compose logs -f backend
docker-compose down -v             # stop + wipe volumes
```
