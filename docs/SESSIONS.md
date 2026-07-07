# Arjuna — Work Plan (session-wise)

Sequenced so confirmed P0 fixes ship first, then a safety net, then a sweep for
hidden bugs, then the two big features (Scenario 1 & 3).

Status legend: 🔴 Broken · 🟠 Needs improvement · 🔵 Suggestion · ⚪ Not started · 🟢 Working · ❓ Unverified
Priority: P0 blocks a whole feature · P1 subset/silent · P2 quality/polish · P3 cosmetic

**"Done" vs "Verified"** — these are different claims. "✅ done + live-tested"
means: tsc/build clean, and a live click-through proved the request reaches
the server correctly with the new code path (network-level proof, no client
crash). "✅ Verified" means someone actually read real AI output and confirmed
it's good — that's only possible once a valid Gemini key exists somewhere
(currently: nowhere, see the open item below). Don't conflate the two; a
session marked "done" can still ship a prompt that reads badly in practice.

## Decision (2026-07-07) — AI provider stays Gemini

Considered switching the built-in AI to Claude Haiku. Decided against: the
Gemini API key is free (AI Studio, ₹0), while Anthropic has no free tier and
Haiku costs ~10x per token — the free tier is load-bearing for the
"free tier generous" product principle and the 15 alpha families. Revisit only
if real testing shows Gemini quality is insufficient; the noted middle path is
Haiku solely for the research-once-cached teaching plans (`lib/teachingPlan.ts`).

## 🔴 Open — production env vars missing (blocks everything AI/Supabase-backed)

Confirmed via `curl https://arjuna-ai-tutor.vercel.app/api/health`: both
Supabase and Gemini report `not_configured` on production. This is the real
cause behind "AI key not working" and exam creation failing — not a code bug.
Invite links only work because of a file-based fallback specific to invites;
everything else Supabase-backed (exams, curricula, student memory) silently
no-ops.

**Needs to be set in Vercel → Project → Settings → Environment Variables**
(Production scope), then redeploy:
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL` (`https://shikwtguxfhefzvfkedo.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (recommended, for server-side writes)

This requires the account owner — the Vercel CLI in this project is not
logged in here (`vercel whoami` → "specified token is not valid"), so it
can't be set from this session without `vercel login` being run interactively
first. **Never paste real key values into this file or any other committed
file** — set them directly in the Vercel dashboard (or via `vercel env add`
after logging in locally). Re-verify with `/api/health` once set.

## Overview

| # | Session | Priority | Effort | Test by opening | State |
|---|---------|----------|--------|-----------------|-------|
| S0 | Baseline test pass (no code) | — | S | every link | ☐ |
| S1 | Restore English tab + Exam key | P0/P1 | M | `/english`, `/exam` | ✅ done + live-tested + deployed |
| S1.5 | Task-based, real-world teaching content redesign | P1 | M | `/`, `/english`, `/exam` | ✅ done + live-tested + deployed |
| S2 | Observability + smoke test net | P1 | M | `npm run smoke` | ✅ done + live-tested + deployed |
| S3 | Sweep unverified (TV, owner, family, curriculum) | P1 | L | `/join/family01`, `/tv`, `/owner` | ✅ swept — no P0 bugs found |
| S4 | Lifecycle & robustness polish | P2 | S | `/`, `/english` | ✅ done + live-tested + deployed |
| S5 | Scenario 1 — smart multi-subject read | P1 | M | `/` (4-subject photo) | ✅ done + live-tested + deployed |
| S6 | Scenario 3 — revision scheduler | P1 | L | `/exam`, `/owner` | ☐ |
| S7 | Consistency & cleanup (one AI client) | P2 | M | `/`, `/english`, `/exam` | ☐ |
| S8 | PDF polish + backlog + roadmap update | P2/P3 | S | `/`, `/roadmap` | ☐ |
| S1.7 | Exam input parity (upload JPG/PDF/PNG, scan, type, speak) | P1 | M | `/exam` | ✅ done + live-tested + deployed |
| S1.8 | Homework label clarity, curriculum preview+confirm, multi-subject exam create | P1/P2 | M | `/`, `/settings`, `/exam` | ✅ done + live-tested + deployed |
| S9 | School Message Understanding Agent (homework + notices + timetables, learns from corrections) | P1 | L | `/`, new School Inbox | ☐ designed, not started |

## Confirmed defects (source of truth)

| # | Item | Status | Pri | Session |
|---|------|--------|-----|---------|
| 1 | English `arjunaFetch` calls missing `method:"POST"` → whole English tab dead | ✅ fixed (S1) | P0 | S1 |
| 2 | Exam uses raw `fetch`, never sends `x-gemini-key` → fails for key-only families | ✅ fixed (S1) | P1 | S1 |
| 3 | AI errors swallowed silently, no dev logging/telemetry | 🟠 | P1 | S2 |
| 4 | `TodayRing` reads localStorage in `useState` → hydration flash | 🟠 | P2 | S4 |
| 5 | Avatar `setTimeout` not cleared on unmount | 🟠 | P2 | S4 |
| 6 | Streak `LAST_DAY_KEY` write-timing fragile | 🟠 | P2 | S4 |
| 7 | Three different AI-call patterns | 🟠 | P2 | S7 |
| 8 | `handleStartSelected` / `handleReviewDone` duplicate | 🟠 | P3 | S7 |
| 9 | Unused `onStateChange` prop | 🟠 | P3 | S7 |
| 10 | `loadSettings()` re-runs each render | 🟠 | P3 | S7 |

## Scenario gaps (from product questions)

- **Multi-subject photo, reads only some** — partial extraction is silent; confidence computed but never shown. → **S5**
- **PDF not understood** — client converts PDF→JPEG; on failure, clean fallback to type/photo each page (handled; polish only). → **S8**
- **Weekly test + 20–30 day revision** — no scheduler at all; manual one-shot only (roadmap text only). → **S6**

## Workflow (standing, applies every session)

1. Automated checks: `npx tsc --noEmit` + `npm run build` must be clean.
2. Live click-through: drive the actual dev server (preview tools) through the
   real user flow the session touched, inspect network requests/responses —
   not just "it compiles."
3. Direct push to `main` (Vercel auto-deploys) so your existing production
   links (arjuna-ai-tutor.vercel.app/*) reflect the change — no new preview URLs.
4. After push: a short checklist message — what changed, which of your existing
   links to open, what to tap/check.

## Session detail

### S1 — Restore English tab + Exam key
- `lib/apiClient.ts`: `arjunaFetch` defaults to POST when a `json` body is present.
- Add explicit `method:"POST"` at the 5 English call sites (belt + braces).
- `components/ExamHub.tsx`: route the 6 AI calls (timetable, material, revise×2, quiz×2) through the key-aware helper.
- **Verify:** `/english` (Learn/Words/Journal all work), `/exam` (works with own key in `/settings`).

### S1.5 — Task-based, real-world teaching content redesign
Pedagogy research (task-based learning, inquiry-based scaffolding, gamification effect
size in elementary kids, vocabulary/journaling via personal + imagery) applied to:
- **Shared scenario bank** (`REAL_WORLD_SCENARIO_BANK` in `lib/prompts.ts`): one
  reusable set of concrete Indian-kid scenes grouped by subject (auto-rickshaw
  fare/cricket scores for Maths, why-questions like the tava/fan for Science,
  tiffin/school-bag labels/cricket commentary for English grammar, festival
  greetings for Telugu/Hindi, market/train journey for Social/EVS) — referenced
  from every prompt below instead of each one inventing its own generic filler.
- **English concept sessions** (`buildEnglishConceptPrompt`): Step 2 (examples),
  Step 3 (try), Step 4 (explain-back) and Step 5 (mini-check) all now instruct
  picking one scene from the bank matching the concept and framing it as a task
  the child does, not a fact recited ("help me label these for your tiffin box").
- **Homework teaching method** (`buildSystemPrompt` methodBlock + `buildExplainAgainPrompt`):
  "nudge → real-life example" now points at the scenario bank matched to the
  subject already in context, instead of a static "fingers, peanuts, toys" line.
- **Exam revision** (`buildExamRevisionPrompt`): same bank, matched to subject.
- **Exam quiz** (`buildExamQuizPrompt`): wraps the whole quiz as ONE mission
  with a title and throughline (e.g. "Help the cricket team win the final
  over") instead of 4 plain MCQs + 1 gamified bolt-on; each question is a
  "checkpoint" referencing the same scene. Added `missionTitle` to the
  response contract (`lib/gemini.ts` `generateExamQuiz`,
  `app/api/exam/quiz/route.ts`, `ExamHub.tsx` renders it as a 🎯 banner above
  "Checkpoint 1/2/…" per question).
- **Daily Words** (`DAILY_WORDS_PROMPT`): every example sentence must be
  about something a real Indian school child does, not generic filler.
- **Journal prompts** (`lib/englishJournalStore.ts`): swapped the vaguest
  open-ended prompt ("A story idea — start anywhere!") and added two more
  grounded in real life (food, games with friends, family weekend).
- **Verify:** live-tested — English concept request reaches the server with
  the new prompt correctly (no template-literal bug, same pre-existing 401
  key issue as before, not a regression); mocked the quiz API response to
  confirm the UI renders "🎯 {missionTitle}" and "CHECKPOINT 1/2" correctly
  end-to-end without needing a working Gemini key.
- **Known limitation:** actual model OUTPUT quality (whether Gemini's replies
  really land as vivid and Indian-specific as intended) still can't be verified
  end-to-end until a valid key exists somewhere (local or Vercel) — everything
  here is verified structurally (reaches Gemini correctly, renders correctly),
  not by reading real generated text.

### S1.7 — Exam input parity (upload/scan/type/speak)
Homework already had all four input modes (scan, gallery upload of JPG/PDF/PNG,
type, speak). Exam prep only had camera-only, image-only capture. Brought to parity:
- **Timetable**: new capture screen with Scan (camera) + Choose file (gallery,
  image/PDF, multi-page) + type-the-schedule textarea + 🎤 speak-to-transcribe.
  New backend: `extractExamTimetable` now takes multiple images; new
  `extractExamTimetableFromText` parses typed/spoken schedules directly
  (`lib/gemini.ts`, `lib/prompts.ts`, `app/api/exam/timetable/route.ts` rewritten
  to support multipart multi-photo + JSON text paths).
- **Study material**: added PDF support + gallery picker (was camera-only image),
  client-side PDF→JPEG conversion via existing `prepareUploadFiles`, and a
  🎤 speak-to-topics button feeding the existing "Extra topics" field. Left the
  "generate concept notes from typed topics alone, no material" path out on
  purpose — the app's invariant is concepts only come from what's actually
  uploaded (matches `CONCEPT_EXTRACTION_PROMPT`'s anti-hallucination rule).
- **Verify:** open `/exam` → Timetable — all four options render; typed-schedule
  path reaches the server correctly (live-tested). Material upload's new UI
  verified via code + build; full click-through blocked locally by a pre-existing
  Supabase config gap unrelated to this change (`/api/exam` create already fails
  without the `arjuna_exams` migration — not something this session touched).

### S1.8 — Homework label clarity, curriculum preview+confirm, multi-subject exam create
Direct user testing on production surfaced one critical infra finding and three
real UX gaps:
- **Critical (not code):** `/api/health` on production shows both Supabase and
  Gemini as `not_configured` — confirmed via curl. This is why "AI key not
  working" and exam creation ("upload pages") were failing — Vercel is
  missing `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (and ideally `SUPABASE_SERVICE_ROLE_KEY`).
  Invite links still worked only because of a file-based fallback specific
  to invites — everything else Supabase-backed (exams, curricula, student
  memory) silently no-ops. **User action required** — I can't set Vercel env vars.
- **Homework capture tray**: "Type instead" and "Enter myself" looked like
  duplicates. Relabeled to "Type & let Arjuna read it" (AI-parsed) vs
  "Skip AI, add tasks myself" (manual, no AI) — same underlying behavior,
  clearer intent.
- **Curriculum/syllabus upload** (`/settings`): previously extracted and
  saved in one shot with no visibility. Split `/api/curriculum` into a
  `preview=true` extract-only mode and a JSON confirm-save mode; client shows
  selected file names immediately and an "Is this what you uploaded? ✅ Save
  / ✕ Discard" card with the parsed subjects/topics before anything is saved.
- **Exam create flow**: replaced the single subject+date+comma-topics form
  with repeatable subject rows (add/remove), each with its own exam date and
  a topics field with type-or-speak (reused/generalized the `toggleMic`
  helper from S1.7 to take an arbitrary target id + callback instead of a
  fixed two-value union). Submitting loops one `/api/exam` POST per subject.
- **Verify:** live-tested — relabeled buttons render; typed a 2-subject form
  and confirmed two separate `POST /api/exam` calls fired (both correctly
  blocked only by the missing-Supabase-env issue above, not a code bug);
  curriculum preview and confirm-save paths both reach their Gemini/Supabase
  calls correctly (same pre-existing env blockers, not code bugs).

### S2 — Observability + smoke test
- Added `lib/devLog.ts` (`logDevError(context, error)` — logs to console only
  outside production, friendly UI text unchanged) and wired it into every
  AI-call catch block across the app: `useLessonSession.ts` (speak, teach,
  extract, verify-answer, unlock-solution), `ExamHub.tsx` (12 of its 14
  catches — skipped the two mic-permission `getUserMedia` denials, which are
  self-explanatory, not silent bugs), `EnglishConceptSession.tsx`,
  `DailyWordsCard.tsx`, `JournalSection.tsx`, `EnglishHub.tsx`,
  `CurriculumNudge.tsx`, and the curriculum preview/confirm catches in
  `app/settings/page.tsx`. The next silent failure will show a real stack
  trace in the browser console instead of just a generic user-facing string.
- `scripts/smoke.mjs` (`npm run smoke`): hits all 44 route handlers across the
  34 `/api/*` files with minimal payloads and asserts the response parses as
  JSON — Next's default crash page is HTML, so a JSON-parse failure reliably
  catches an unhandled exception. 400/401/404/502/503 with a structured JSON
  body all count as PASS (expected without Gemini/Supabase configured); only
  a non-JSON response or a request that never completes counts as FAIL.
  Requires a running dev server (`npm run dev` in one terminal); not wired to
  CI yet since this repo doesn't have a CI pipeline configured.
- Added the "Done vs Verified" distinction to this file's legend (see above) —
  the meta-gap from the original review: a session can be "done" (shipped,
  structurally tested) without being "Verified" (real output confirmed good).
- **Verify:** ran `npm run smoke` against a live local dev server — all 44
  routes responded with parseable JSON, 0 failures.

### S3 — Sweep unverified areas
Read every file in the four unverified areas and live-tested where possible.
**Result: no P0 bugs found** — genuinely good news, unlike S1's dead English
tab or the missing env vars. Two dead-code items surfaced (queued for S7,
not fixed here since S3 is a verification pass, not a cleanup pass):
- `lib/familyAuth.ts` (password-hash cookie helpers) — zero imports anywhere.
  `JoinForm.tsx` never asks for a password; the invite code is the only
  credential now (matches the "Simplify family link flow" commit history).
  `/api/family/[code]/verify/route.ts` is explicitly commented "Legacy route."
- `components/TvScreen.tsx` + `hooks/useRoomSync.ts` (`useRoomPublisher`/
  `useRoomSubscriber`) + the polling-based `/api/room/route.ts` and
  `/api/room/[code]/route.ts` — orphaned. `/tv` actually renders
  `TvLessonScreen.tsx`, which uses the newer Supabase-realtime room system
  (`useSupabaseRoom.ts` + `/api/room/supabase`) instead.

What was verified and found solid:
- **Family/join flow**: `JoinForm.tsx` gracefully falls back to a local-only
  profile (`tryAddProfile`) whenever the server/Supabase call fails — this is
  why family onboarding still works today despite Supabase being unconfigured
  in production.
- **Room sync (active path)**: `lib/supabaseRoom.ts` + `/api/room/supabase`
  degrade cleanly (null/404/503) when Supabase is down; room codes check for
  collisions; TTL cleanup on read.
- **Owner dashboard**: live-tested for real with the actual local
  `OWNER_PASSWORD` — login → dashboard → all 15 invite links render → health
  card correctly shows "Supabase: Broken" / "Gemini: Broken" (matching known
  local config gaps, not a dashboard bug) → analytics page shows a clear
  "Could not load analytics" message rather than hanging, when `/api/events`
  is unavailable.
- **Curriculum engine**: `schoolAgent.ts`, `studentAgent.ts`, `teachingPlan.ts`,
  `memory.ts` (`getOrCreate` cache), `bridgeSubject.ts` all read correctly;
  `bridgeSpeechLanguage`/`bridgeSubjectFor` logic cross-checked and consistent
  (Telugu-medium → bridge subject is English, spoken as en-IN; English-medium
  → bridge subject is Hindi, spoken as hi-IN).

### S4 — Lifecycle & robustness polish
- `TodayRing.tsx`: initial state now matches the SSR-safe defaults (0/0/3,
  empty badges) instead of calling `getStreak()`/`getBadges()` inside the
  `useState` initializer — that ran on the client during hydration with
  `window` defined, reading real localStorage immediately and mismatching
  the server-rendered 0s. Real values now load in the existing `useEffect`.
- `LessonScreen.tsx`: the "celebrate" avatar `setTimeout` (1200ms, on
  Understood) is now tracked in a ref, cleared before starting a new one,
  and cleared on unmount — previously it could fire `setAvatarOverride` after
  the component (or child profile) had already unmounted.
- `lib/streak.ts`: `rollDayIfNeeded` now always writes `LAST_DAY_KEY` to
  today whenever it detects a day change — previously only
  `recordDailyActivity` wrote that key, so opening the app on a new day
  without completing any activity left `LAST_DAY_KEY` stale. Also simplified
  `recordDailyActivity` to call the shared `rollDayIfNeeded()` instead of
  re-implementing the same rollover comparison inline (two copies of the
  same logic was itself a latent bug source).
- **Verify:** live-tested all three — seeded a streak of 5, reloaded, and
  confirmed via console logs there's no React hydration warning and the UI
  shows 5 immediately after mount; seeded `LAST_DAY_KEY` two days stale with
  no activity recorded, reloaded, and confirmed `rollDayIfNeeded` correctly
  reset the streak to 0 **and** synced `LAST_DAY_KEY` to today without
  needing `recordDailyActivity` to run first.

### S5 — Scenario 1: smart multi-subject read
Partial extraction is no longer silent. Two helpers in `lib/homeworkReview.ts`:
- `usualSubjectsFromHistory(history)` — subjects seen 2+ times in the child's
  task history (excluding "Other"), most-frequent first.
- `buildExtractionHint({foundTasks, confidence, usualSubjects})` — always says
  how many tasks were found; flags low confidence ("Not fully sure I read the
  page right"); if usual subjects are missing from the result, nudges by name
  ("No English, Telugu today? If I missed some, tap Add page or add them
  yourself"); if only 1 task and no history signal, generic add-more nudge;
  otherwise the old compact chip hint.
- Wired into `LessonScreen.runRead` (non-merge path) replacing the fixed
  "Check each task…" string. The extractor's `confidence` field, previously
  computed and thrown away, is now user-visible.
- **Verify:** live-tested with a seeded 6-entry history (Maths/English/Telugu
  ×2 each) + mocked extract responses: 1 low-confidence Maths task → hint
  correctly named the two missing subjects and the confidence warning; 3
  high-confidence tasks → compact "Found 3 tasks" with no false alarm.

### S6 — Scenario 3: revision scheduler
- Per-child schedule store from term plan → weeks; reuse Vercel cron to auto-generate weekly quiz; spaced-revision queue at 20–30 days; parent reminder via `whatsapp.ts`/email placeholder.

### S7 — Consistency & cleanup
- One AI client everywhere; delete duplicate; drop unused prop; cap journal/daily-words storage.
- Delete dead code found in S3: `lib/familyAuth.ts` (0 imports), and the
  orphaned TV path `components/TvScreen.tsx` + `hooks/useRoomSync.ts` +
  `app/api/room/route.ts` + `app/api/room/[code]/route.ts` (superseded by
  the Supabase room system `TvLessonScreen.tsx`/`useSupabaseRoom.ts`/
  `/api/room/supabase`). Confirm nothing else imports these first.

### S8 — PDF polish + backlog + roadmap
- Use `reason:"pdf_unsupported"` for a sharper tip / per-page retry; update `/roadmap` (Spaced-repetition + Weekly-report → Shipped).

### S9 — School Message Understanding Agent (designed, not yet built)
User wants a separate agent to understand homework AND other school
communications, and to be able to "teach" it over time. Scoped via discussion:
- **Handles:** homework diary (absorbs existing extraction), school
  notices/circulars (new — holiday notices, PTM announcements, fee reminders,
  event circulars — currently no path for these at all), and exam timetables
  (fold in conceptually; S1.7 already built the timetable pipeline).
- **"Teaching" mechanism — learn from corrections over time (chosen over
  upfront-rules-only):** there's no local model to fine-tune here, so
  "teaching" means a persistent per-school memory of corrections fed back into
  future extraction prompts as context — the same shape as the existing
  `teachingPlan.ts` research-once-cache-reuse pattern, applied to message
  understanding instead of invented fresh.
- **Sharing scope — shared per-school (chosen over private-per-family):**
  reuses the existing `schoolKey` mechanism (school+grade+board). One
  family's correction improves extraction for every other family at that
  school immediately.

**Architecture:**
1. One classifying entry point (`/api/school/understand`): parent scans/
   types/speaks anything from school; a lightweight classifier prompt sorts
   it into homework / notice-circular / exam timetable, then routes to the
   matching specialist extractor.
2. New notices/circulars pipeline: new prompt producing
   `{type: holiday|ptm|fee|event|other, title, date, summary, actionNeeded}`,
   surfaced in a new **School Inbox** card on the Homework tab (this is
   backlog item "School comms inbox" from the roadmap — direct alignment).
   Same capture tray (scan/upload/type/speak) as everywhere else for consistency.
3. The teaching loop: parent corrects a task/notice in the review screen (the
   diff between what the agent produced and what the parent finalized is
   currently thrown away — this session captures it); log the correction to
   a new `arjuna_school_corrections` Supabase table keyed by `schoolKey`;
   periodically (every few corrections) one Gemini call distills the raw
   correction log into a compact ~5-10 rule ruleset per school, cached and
   reused (mirrors the teaching-plan cache); every future extraction for that
   school includes the latest learned rules automatically.

**Size/risk note:** needs a new Supabase table/migration (the one genuinely
hard-to-reverse piece — write the SQL for the user to run, don't apply it
autonomously), 2 new API routes, one new prompt set, a correction-diff hook
wired into the existing review screens, and a new Inbox UI. Comparable in
size to S6 (revision scheduler). Not started — awaiting a go-ahead to build.
