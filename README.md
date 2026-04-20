# SpeakFlo AI

AI-powered English learning app with a `Next.js` frontend, `FastAPI` backend, and `Supabase Postgres` as the primary database.

## Current Stack

- Frontend: `Next.js` + TypeScript + Tailwind
- Backend: `FastAPI` + SQLAlchemy
- Database: `Supabase Postgres`
- AI: `OpenAI Responses API`
- Frontend hosting target: `Vercel`
- Backend hosting target: `Railway`, `Render`, or `Fly.io`

## Repository Structure

```txt
frontend/   Next.js app
backend/    FastAPI app
```

## Local Development

### Prerequisites

- Node.js 18+
- Python 3.12+
- A Supabase project
- An OpenAI API key for live model responses

### 1. Frontend setup

```bash
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

### 2. Backend setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Update `backend/.env` with:

- `DATABASE_URL`: your Supabase Postgres connection string
- `OPENAI_API_KEY`: your OpenAI key
- `SECRET_KEY`: a long random app secret

Then start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`.

## Supabase Postgres Notes

- Use the Supabase Postgres connection string in `DATABASE_URL`
- SSL is enabled by default via `DATABASE_SSL_MODE=require`
- Startup schema creation and lightweight migrations run from `backend/app/database.py`

## Key Environment Files

- [backend/.env.example](./backend/.env.example)
- [frontend/.env.example](./frontend/.env.example)

## Main Docs

- [API_DESIGN.md](./API_DESIGN.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## Status

- Backend imports successfully with the current FastAPI structure
- Frontend lint passes
- Auth, coaching, and vocabulary review APIs are present
- Supabase Postgres is now the intended database foundation
