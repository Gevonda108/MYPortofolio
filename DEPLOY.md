# Deploy Guide (Vercel + Neon)

This project is set up for:

- Frontend on Vercel
- API routes in `/api` on Vercel
- Neon Postgres database

## Required environment variable

Set one of these in Vercel Project Settings -> Environment Variables:

- `DATABASE_URL` (recommended)
- `POSTGRES_URL` (fallback)

Use your Neon connection string.

## Deploy steps

1. Push the repo to GitHub.
2. Import the project in Vercel.
3. Add `DATABASE_URL` in Vercel env vars.
4. Deploy.

API endpoints used by the site:

- `/api/suggestions`
- `/api/reviews`

## Local development

Run API + frontend separately:

- Terminal 1: `./npm.bat run dev:api`
- Terminal 2: `./npm.bat run dev`

Or use one command:

- `./npm.bat run dev:all`

## Security

If a connection string is ever exposed publicly, rotate it in Neon immediately and update Vercel env vars.
