# Deploy Arjuna web + APK

## Quick release script

```bash
cd arjuna
node scripts/release.mjs
```

Then follow the printed checklist (Vercel deploy, cap sync, APK copy).

## 1. Run Supabase migrations

Open [Supabase SQL editor](https://supabase.com/dashboard/project/shikwtguxfhefzvfkedo/sql) and run:

- `supabase/migrations/001_arjuna_mvp.sql`
- `supabase/migrations/002_arjuna_feedback.sql`

Creates events, rooms, exams, curricula, memory, and **parent feedback** tables.

## 2. Environment variables

In `arjuna/.env.local` (server / Vercel):

```
NEXT_PUBLIC_ARJUNA_PHASE=alpha
GEMINI_API_KEY=your_key          # optional if families paste key in Settings
SARVAM_API_KEY=your_key
NEXT_PUBLIC_SUPABASE_URL=https://shikwtguxfhefzvfkedo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
OWNER_PASSWORD=your_owner_password
CAPACITOR_SERVER_URL=https://arjuna-ai-tutor.vercel.app
```

Optional: `SUPABASE_SERVICE_ROLE_KEY` for server writes if RLS blocks inserts.

**Family phones:** paste Gemini key in **Settings → Gemini AI key** (no server restart needed).

## 3. Deploy web app

```bash
cd arjuna
npm run build
vercel --prod
```

Copy the HTTPS URL into `CAPACITOR_SERVER_URL`.

## 4. Build Android APK

```bash
npm run build
npx cap sync android
npx cap open android
```

Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**

Copy APK to `public/Arjuna-latest.apk` and redeploy web so `/download` serves the latest build.

**Note:** APK loads the live Vercel URL. Web updates apply without reinstall unless native config changes.

## 5. Verify on phone

| Check | Pass |
|---|---|
| Settings → Gemini test | Green |
| Lesson → photo diary | Tasks extracted |
| Settings → parent feedback | Appears on `/owner` |
| Download APK | Same URL loads |

## 6. Owner dashboard

- `/owner/login` → sessions, **parent feedback (AI analyzed)**, invites
- `/owner/analytics` → event counts

Owner password: `OWNER_PASSWORD` in `.env.local`.
