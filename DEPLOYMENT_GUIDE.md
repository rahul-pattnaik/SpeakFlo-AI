# SpeakFlo AI - Deployment Guide

## Target Deployment

- Frontend: `Vercel`
- Backend: `Railway`, `Render`, or `Fly.io`
- Database: `Supabase Postgres`

## Required Environment Variables

### Backend

```txt
DATABASE_URL=<Supabase Postgres connection string>
DATABASE_SSL_MODE=require
SECRET_KEY=<long random secret>
ACCESS_TOKEN_EXPIRE_SECONDS=900
REFRESH_TOKEN_EXPIRE_SECONDS=604800
OPENAI_API_KEY=<your key>
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_TEXT_MODEL=gpt-5.4-mini
FRONTEND_API_BASE_URL=<backend public base url>
```

### Frontend

```txt
NEXT_PUBLIC_API_BASE_URL=<backend public base url>
```

## Supabase Setup

1. Create a Supabase project.
2. Open `Project Settings -> Database`.
3. Copy the Postgres connection string or pooler URL.
4. Put it into `DATABASE_URL`.
5. Keep `DATABASE_SSL_MODE=require`.

## Local Startup

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

## Production Deployment

### Frontend on Vercel

1. Import the GitHub repo into Vercel.
2. Set `NEXT_PUBLIC_API_BASE_URL` to the public backend URL.
3. Deploy.

### Backend on Railway / Render / Fly.io

1. Create a Python web service from this repository.
2. Set the backend environment variables listed above.
3. Use this start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

4. Point `DATABASE_URL` to Supabase Postgres.

## Database Operations

The current backend creates tables and applies lightweight SQL migrations during startup from `backend/app/database.py`.

Recommended release workflow:

1. Test schema changes against a staging Supabase project.
2. Deploy backward-compatible app changes first when possible.
3. Deploy production after confirming startup migrations succeed.

## Backups

Supabase manages database backups on supported plans. For manual logical backups, use the Supabase CLI:

```bash
supabase db dump -f backup.sql
```

## Health Check Recommendation

Expose a simple health endpoint that verifies:

- API is running
- database connection works
- OpenAI key is configured when required

## Current Notes

- Redis is not part of the current runtime foundation
- Supabase Auth and Supabase Storage can be adopted later, but they are not required for the current backend
