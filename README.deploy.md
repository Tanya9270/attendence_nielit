# Deploying with Supabase (Postgres) + Netlify frontend + Railway/Render backend

This document shows the minimal steps to use Supabase as the database and keep your existing Express backend deployed on Railway or Render, and the frontend on Netlify.

1) Prepare Supabase

- Create a new project at https://app.supabase.com
- Copy the Postgres connection string (Settings → Database → Connection string). This is your `DATABASE_URL`.

2) Apply the schema (two options)

- Option A — using the included helper script (recommended):

  Set `DATABASE_URL` and run the Node script which executes `database/schema_postgres.sql`.

  Linux/macOS / PowerShell example:

  ```bash
  # using env
  DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.pxdvfzwzoviwiwhezzjd.supabase.co:5432/postgres" node scripts/run_schema_supabase.js

  # or pass as argument
  node scripts/run_schema_supabase.js "postgresql://postgres:YOUR_PASSWORD@db.pxdvfzwzoviwiwhezzjd.supabase.co:5432/postgres"
  ```

- Option B — Supabase SQL editor:
  - Open Supabase project → SQL Editor → New query
  - Paste contents of `database/schema_postgres.sql` and Run

3) Deploy backend (Railway / Render)

- Create a project on Railway (or Render) and connect your GitHub repo.
- Add environment variables in the service settings (replace values):

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.pxdvfzwzoviwiwhezzjd.supabase.co:5432/postgres
JWT_SECRET=replace_with_a_strong_secret
NODE_ENV=production
ALLOWED_ORIGINS=https://your-netlify-site.netlify.app
DATABASE_SSL=true
```

- Deploy. The service will expose an HTTPS URL (e.g. `https://your-backend.up.railway.app`). The server exposes API at `/api`.

4) Configure Netlify (frontend)

- In your Netlify site settings → Build & deploy → Environment → Add variable:

```
VITE_API_URL=https://your-backend.up.railway.app/api
```

- Trigger a deploy (or deploy from repo). Netlify serves the frontend over HTTPS so cameras will work.

5) Test

- Open your Netlify URL, login as admin, try creating teachers/students — confirm records appear in Supabase.

6) Backups and monitoring

- Supabase free tier has limited backup/retention. Periodically run `pg_dump` to export critical tables.

7) Troubleshooting

- If DB SSL errors occur, set `DATABASE_SSL=true` or `PGSSLMODE=no-verify` in your service env (less secure but useful for quick setup).
- Ensure `ALLOWED_ORIGINS` includes your Netlify domain.
