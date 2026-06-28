# Deploy Arjuna APK for testing

## 1. Run Supabase migration

Open [Supabase SQL editor](https://supabase.com/dashboard/project/shikwtguxfhefzvfkedo/sql) and run:

`supabase/migrations/001_arjuna_mvp.sql`

Creates `arjuna_events`, `arjuna_rooms`, and `arjuna_exams` tables + Realtime.

## 2. Environment variables

In `arjuna/.env.local`:

```
NEXT_PUBLIC_ARJUNA_PHASE=alpha
GEMINI_API_KEY=your_key
SARVAM_API_KEY=your_key
NEXT_PUBLIC_SUPABASE_URL=https://shikwtguxfhefzvfkedo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
OWNER_PASSWORD=your_owner_password
CAPACITOR_SERVER_URL=https://YOUR_VERCEL_URL
```

Optional: `SUPABASE_SERVICE_ROLE_KEY` for server writes if RLS blocks inserts.

## 3. Deploy web app

```bash
cd arjuna
npm run build
# Deploy to Vercel (or any HTTPS host)
vercel --prod
```

Copy the HTTPS URL into `CAPACITOR_SERVER_URL`.

## 4. Build Android APK

```bash
npm run build
npx cap sync android
npx cap open android
```

In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**

Install on phone and Android TV (same APK — Leanback launcher supported).

## 5. Test the three modes

| Mode | Settings | Flow |
|---|---|---|
| Phone only | Device mode → Phone only | Photo/mic/type on phone |
| Phone + TV | Device mode → Phone upload → TV | Phone uploads, enter code on TV |
| TV only | Device mode → TV only | Mic/type on TV (no camera) |

## 6. View analytics

- **Owner dashboard:** `/owner/login` → `/owner/analytics`
- **Raw data:** Supabase → Table Editor → `arjuna_events`

Owner password: `OWNER_PASSWORD` in `.env.local`.
