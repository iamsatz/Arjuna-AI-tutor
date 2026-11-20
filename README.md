# Arjuna

Voice-first AI homework tutor for Indian school kids. The child snaps or speaks
their homework, and Arjuna teaches it task by task in Telugu, English or a mix.
Runs on the web, as an Android app (Capacitor) and on a TV.

## What's inside

| Area | Where | What it does |
|---|---|---|
| Homework | `/` | Photo, voice or typing becomes tasks; Arjuna teaches each one |
| Exam prep | `/exam` | Textbook pages + timetable become revision, quizzes and a weekly plan |
| English | `/english` | Concept lessons, daily words, journal |
| TV | `/tv` | Big-screen lesson view, synced with the phone |
| Family | `/join/[code]`, `/settings`, `/download` | Invite onboarding, kid profiles, Android APK |
| Owner | `/owner`, `/owner/analytics` | Password-protected dashboard: invites, sessions, feedback, alerts |

## Tech

Next.js 14 + React + Tailwind · Google Gemini (AI) · Sarvam (speech) ·
Supabase (data) · Capacitor (Android) · Vercel (hosting).

## Run it locally

```bash
cp .env.example .env.local   # fill in the keys
npm install
npm run dev                  # http://localhost:3000
```

Other scripts: `npm run build`, `npm run smoke` (API smoke test against a running
dev server), `npm run supabase:setup`, `npm run cap:android`.

## Docs

- [`docs/DEPLOY.md`](docs/DEPLOY.md): Supabase migrations, env vars, Vercel and APK release
- [`docs/SESSIONS.md`](docs/SESSIONS.md): work plan and decisions log
- [`BACKLOG.md`](BACKLOG.md): open issues from the latest review

Product docs (PRD, research, specs) live in the private
`arjun-ai-tuition-research` repo.
