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
| S6 | Scenario 3 — revision scheduler | P1 | L | `/exam` | ✅ done + live-tested + deployed |
| S7 | Consistency & cleanup (one AI client) | P2 | M | `/`, `/english`, `/exam` | ✅ done + live-tested + deployed |
| S8 | PDF polish + backlog + roadmap update | P2/P3 | S | `/`, `/roadmap` | ☐ |
| S1.7 | Exam input parity (upload JPG/PDF/PNG, scan, type, speak) | P1 | M | `/exam` | ✅ done + live-tested + deployed |
| S1.8 | Homework label clarity, curriculum preview+confirm, multi-subject exam create | P1/P2 | M | `/`, `/settings`, `/exam` | ✅ done + live-tested + deployed |
| S9 | School Message Understanding Agent (homework + notices + timetables, learns from corrections) | P1 | L | `/`, new School Inbox | ☐ designed, not started |
| S6.5 | Family-code UX: paste-the-link input + owner WhatsApp share | P2 | S | `/` (no profile), `/owner` | ✅ done + live-tested + deployed |
| MVP-S1 | Remove PINs + gate every AI route (2026-08-13) | P0 | M | `curl` any AI route | ✅ done + live-verified |
| MVP-S2 | TV display + dual controller (TV remote + phone) (2026-08-14) | P0 | L | `/tv` + phone | ✅ done + browser-verified (live pairing blocked on Supabase) |
| MVP-S3 | Extraction reliability + conversational fallback | P0 | L | `/` blurred photo | ☐ |
| MVP-S4 | Session integrity (25-min cap, answer-leak filter, Supabase sessions) | P1 | M | `/` | ☐ |
| MVP-S5 | Foundations (ESLint, Telugu copy, smoke tests) | P2 | M | `npm run lint` | ☐ |

## MVP re-scope (2026-08-13) — PIN removal + security hardening

Full code review of ~15,900 lines produced `BACKLOG.md` (everything found) and a
5-session plan. Session 1 is done; Sessions 2–5 are queued.

### MVP-S1 — Remove PINs + close the open doors ✅ done + live-verified

Three critical findings drove this:

1. **The PIN was never checked.** `/api/solution` tested `pin.length >= 4` and
   never the value, so `"0000"` returned the full worked solution. The "real"
   PIN lived in localStorage defaulting to `1234`.
2. **Every AI route was unauthenticated** and falls back to the server
   `GEMINI_API_KEY`, so anyone with the URL could spend the owner's quota.
3. **`/api/summary` was open to the internet** and sends WhatsApp messages to
   the parents' real phone numbers from env vars.

Changes:
- **PINs deleted everywhere** — `parentPin`, `verifyParentPin`, the settings
  field, all `pinInput` forms. `/api/solution` and `generateParentSolution`
  deleted outright (route now 404s).
- **No full-answer reveal on the child's device.** `parent_needed` shows an
  "ask Amma or Nanna" card instead. Exam quiz answers now grade **server-side**:
  `correctIndex` never reaches the browser at all (stricter than before), and a
  wrong answer says "not quite — have another go" without revealing the right
  option. Deleting the reveal outright would have left the quiz with zero
  feedback, which is why grading moved rather than disappeared.
- **KidSwitcher** delete guard is now a typed-name confirm, not a PIN.
- **`lib/apiAuth.ts` `requireInvite()`** gates 20+ AI/mutating routes on a valid
  invite code. `lib/inviteHeader.ts` holds the shared constant — `apiAuth`
  reaches `fs` via the invite store, so the client must not import from it
  (caught by `next build`, not by `tsc`).
- **Gemini key is header-only.** It was being written into JSON request bodies
  as well, landing the parent's Google key in server logs.

**Verify:** `npx tsc --noEmit` clean, `next build` clean, and a live probe of 11
routes against a production server — each returns 401 with no header, 401 with
an invalid code, and normal validation (400/500/502) with `family01`.
`POST /api/solution` → 404.

**Known limitation:** the 502s from `/api/speak` and `/api/gemini-test` are the
dead Sarvam TTS endpoint and the invalid Gemini credential (see the blocked
items at the top of `BACKLOG.md`) — not regressions from this session.

### MVP-S2 — TV display + dual controller ✅ done + browser-verified

No keys were available for this session (deliberately deferred to the end),
so this session focused on what's pure UI: the TV screen itself needs no
Gemini/Sarvam/Supabase call to render — only room *sync* does. Verified via a
throwaway local preview harness in a real browser (Playwright-driven, not
screenshots-only) rather than live phone↔TV pairing.

The actual TV blocker, confirmed by reading the code rather than assuming:
`TvLessonScreen` rendered `<LessonScreen controller="tv" externalState={state} />`
completely unmodified for both `tv_only` and `phone_tv` — the TV showed the
full interactive phone UI (upload buttons, review forms, teaching controls),
and because `readOnly` was **never actually passed by any caller in the
codebase** (grep-confirmed dead prop), both the phone and TV's independent
`useLessonSession` instances called `playSpeech()` for their own actions.

Changes:
- **New `components/TvLessonView.tsx`** — the TV's own screen, not a scaled
  phone UI: full-bleed `ArjunaAvatar`, current task, Arjuna's spoken line, and
  four large remote-focusable buttons (Repeat · Explain differently ·
  I understood · Didn't understand). Sized to fit a 720p viewport without
  scrolling — a real layout bug caught live: the first pass overflowed a
  1280×720 frame, which matters specifically for a D-pad interface since
  there's no scroll affordance to reach an off-screen button.
- **Button semantics deliberately changed from the original plan wording**
  ("Repeat · Next · I understood · Didn't understand"): "Next" read as
  "advance to the next task," which is actually what "I understood" does.
  Relabeled to "Explain differently" and wired to `handleExplainAgain`
  (fresh AI explanation) vs. "Repeat" wired to `speak()` directly — a free
  replay of the last line with no AI call.
- **`TvLessonScreen` rewritten** to stop delegating to `LessonScreen`
  entirely. New `TvLessonRoom` wrapper instantiates `useLessonSession`
  directly (`controller: "tv"`) and drives `TvLessonView`. Both the
  `tv_only` and `phone_tv` render paths now use it.
- **Fixed the double `pushState`** in `patchState`
  (`hooks/useLessonSession.ts`) — computed `next` once and pushed once,
  instead of once inside the `setState` updater and once outside it.
- **D-pad navigation needs no new code.** `git log --all -S"keydown"` and
  `-S"ArrowDown"` return zero hits across every commit — no JS focus manager
  has ever existed. Android TV's WebView maps D-pad to native `<button>`
  focus already; `TvLessonView` reuses the same `.tv-focus` class and
  `ref.current?.focus()` pattern the pairing keypad already proves works.

**New follow-up found while wiring (not yet done):** the TV now correctly
owns its own audio, but the phone's *own* independent session (rendered via
`DeviceRouter` when `deviceMode === "phone_tv"`) still calls `speak()` for
actions it triggers itself (e.g. right after uploading homework), so the
phone can still audibly duplicate the TV. Logged in `BACKLOG.md` as "Phone
companion mode" — needs a `speaksAloud` gate in `useLessonSession` plus
hiding lesson content on the phone per the "controller only" decision.

**Verify:** `npx tsc --noEmit` and `next build` both clean. Rendered all four
`TvLessonView` states (teaching / listening / parent_needed / session_done)
via a mocked `LessonState` in a throwaway `app/dev-tv-preview` route (deleted
after use), screenshotted in-browser. Separately confirmed the real `/tv`
pairing-keypad route still renders and focuses correctly after the rewrite —
one regression caught and fixed along the way: running `next build` while
`next dev` was still serving corrupted the dev server's `.next` cache
(`Cannot find module`), unrelated to the code change; cleared and restarted.

**Known limitation:** live phone→TV pairing is untested — blocked on the
Supabase project recreation noted in `BACKLOG.md`. Per-phase TV copy (for the
five phases outside teaching/parent_needed/session_done) is also left generic;
logged as a follow-up.

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
Built local-first/on-demand instead of the originally sketched Vercel cron —
a deliberate deviation: there is no push channel families would see (WhatsApp
env unconfigured, no notifications), so server-side overnight generation
would be invisible until app-open anyway while burning server AI tokens.
"Due" is computed when the exam tab opens:
- **`lib/revisionPlan.ts`** (new, pure logic): `weeklyPlan(curriculum)` slices
  the term plan into weeks — 2 topics per subject per week, advancing weekly
  since the curriculum was uploaded (`created_at`), wrapping at the end so the
  plan cycles all term; `dueRevisions(history)` returns tasks completed 20–35
  days ago from local task history (deduped, max 6); weekly-test completion
  tracked per profile+week in localStorage (`arjuna-weekly-test-<profileId>`).
- **ExamHub**: two new cards on the list screen. "📅 Week N — this week's
  plan" lists each subject's topics with a one-tap **Weekly test** button →
  creates a ready exam from those topics (`topicsToConceptNotes`) and jumps
  straight into the S1.5 mission quiz; button flips to "✅ Done — retake".
  "🔁 Time to revise" shows chips for 20–35-day-old completed homework →
  one tap creates a ready exam for that topic and opens the revision chat.
- New analytics events: `weekly_test_started`, `spaced_revision_started`.
- SSR-safe: plan/revisions load in effects (S4 hydration pattern), cards
  hidden when no curriculum / no due items.
- **Verify:** live-tested with mocked APIs + seeded 14-day-old curriculum and
  history (2 entries 24–25 days old, 1 entry 10 days old): card showed
  "Week 3" with the correct rotated topic slices (Maths: Decimals+Numbers
  wrap, English: Nouns+Verbs); revision chips included exactly the two due
  items and excluded the 10-day-old one; clicking Weekly test POSTed the
  right topics with status ready and opened the mission quiz; the button
  flipped to Done; clicking a revision chip created the topic exam and
  opened the revision chat.
- **Follow-up (needs env vars first):** server cron + WhatsApp parent
  reminder once GEMINI/Supabase/WHATSAPP env vars exist in production.

### S6.5 — Family-code UX (user question: "how can a user get the family code?")
Reality: the code only comes from the owner's WhatsApp link, and the app never
said so — worst on the APK path, where a parent installing the app is asked
for a "family code" they never explicitly received. Pasting the whole link
into the box also used to break (`/join/https%3A%2F%2F…`).
- `InviteRequired`: new `extractFamilyCode()` accepts anything — bare code,
  stray capitals/spaces, or the entire pasted WhatsApp link (pulls the code
  out of `/join/<code>`); label now "Family code or link"; helper text shows
  where the code lives in the link.
- `/owner`: per-invite **Share on WhatsApp** button (`wa.me` prefilled) with a
  ready message containing the link AND the code spelled out + 3 steps —
  fills the "WhatsApp template: I don't know" gap in the owner's links doc.
- **Verify:** live-tested — pasted the full link with a capital letter and
  trailing space into the code box → landed on `/join/family01` → "Family:
  Family 1" name screen; owner dashboard button generates the correct
  prefilled wa.me message.

### S7 — Consistency & cleanup
- **Deleted 8 confirmed-orphaned files** (re-verified zero imports before
  removal, since a lot changed since S3 flagged the first two):
  `lib/familyAuth.ts`, `components/TvScreen.tsx`, `hooks/useRoomSync.ts`,
  `app/api/room/route.ts`, `app/api/room/[code]/route.ts`, `lib/roomStore.ts`,
  `lib/roomSync.ts` (the whole legacy polling room-sync path, superseded by
  `TvLessonScreen.tsx`/`useSupabaseRoom.ts`/`/api/room/supabase`), and newly
  found **`hooks/useArjunaSession.ts`** — a full parallel session
  implementation with zero imports anywhere, entirely superseded by
  `useLessonSession.ts`. `/api/room/supabase` (the live route) untouched.
- **Collapsed the `handleStartSelected`/`handleReviewDone` duplicate** in
  `LessonScreen.tsx` — confirmed byte-identical, confirmed `onStart` and
  `onDone` never render simultaneously (mutually exclusive on
  `HomeworkTaskReview`'s `editMode`), now both wired to one function.
- **Removed the dead `onStateChange` prop** from `LessonScreenProps` and
  `UseLessonSessionOptions` — threaded through both layers, invoked nowhere,
  passed by zero callers.
- **Audited "one AI client everywhere" and "cap journal/daily-words
  storage"** — both turned out already correct, not bugs:
  - The "3 different AI-call patterns" flagged in the original review are
    legitimately 3 different needs, not inconsistency: `arjunaFetch` for
    JSON bodies, manual `getGeminiKeyHeader()` for multipart/FormData
    uploads (`arjunaFetch` only builds JSON bodies), and a fully raw
    `fetch` for `/api/gemini-test` specifically because that route tests a
    *candidate, not-yet-saved* key — it can't use `arjunaFetch`'s
    auto-attach-the-saved-validated-key logic by design. No consolidation
    needed; every remaining raw `fetch` call is either non-Gemini
    (`/api/student/outcome`, `/api/exam` create, `/api/transcribe`) or
    correctly multipart.
  - `lib/englishJournalStore.ts` already caps at `MAX_ENTRIES = 14`.
    `lib/englishDailyWordsStore.ts` was never at risk — it overwrites one
    fixed key per profile (today's pack), never appends to a growing array.
- **Verify:** tsc + build clean (including a stale-`.next`-cache scare from
  the deleted route files, resolved by clearing `.next` — a real gotcha:
  Next's generated route types lag a beat behind file deletion). Live-tested
  the collapsed handler via the `onStart` path (capture → typed extract →
  review → Start teaching → correctly enters the teaching phase); the
  `onDone` path (mid-lesson "Edit / add page") needs a successful AI teach
  call to reach, blocked by the same missing-Gemini-key env gap as always —
  verified by code equivalence instead (both paths now call the identical
  function, TS confirms the prop signature matches).

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
