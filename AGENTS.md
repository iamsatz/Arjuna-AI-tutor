# AGENTS.md

## Cursor Cloud specific instructions

Arjuna is a single **Next.js 14 (App Router) + TypeScript** app (no separate backend); Capacitor wraps the deployed web app into an Android APK. See `README.md` and `package.json` scripts for standard commands (`npm run dev`, `lint`, `build`, `smoke`).

Non-obvious notes for this environment:

- **Local env file**: dev reads `.env.local` (git-ignored). Copy from `.env.example`. It is created during setup with empty external keys plus `OWNER_PASSWORD=arjuna-dev` so the `/owner` dashboard is reachable locally.
- **App runs fully offline of external APIs.** Missing `SARVAM_API_KEY` (voice STT/TTS), `GEMINI_API_KEY` (AI features), and Supabase env vars do NOT crash the app — those routes return structured `503`/`not_configured` JSON, and persistence falls back to local JSON files in `data/` (`invites.json`, `sessions.json`). Add the real hosted-API keys to `.env.local` only when testing voice/AI features.
- **`/owner` dashboard** is gated by `middleware.ts` using `OWNER_PASSWORD`; log in at `/owner/login`. Owner APIs (`/api/owner/*`, `GET /api/events`) return `401` without the session cookie — this is expected, not a failure.
- **ESLint config**: the repo ships `eslint-config-next` but historically had no config file, so `next lint` would prompt interactively. A `.eslintrc.json` extending `next/core-web-vitals` is committed so `npm run lint` runs non-interactively.
- **`npm run smoke`** requires the dev server running in another terminal. It reports 3 failures for `/api/room` and `/api/room/[code]` — those routes were deleted from the app (only `/api/room/supabase` remains), so the 404s are correct and the smoke list is simply stale. All other 41 routes pass.
- **Supabase** is a remote hosted project (no local DB, no Docker). Migrations in `supabase/migrations/*.sql` are applied manually in the Supabase SQL editor; there is no CLI migration runner.
