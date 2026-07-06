# Arjuna — Work Plan (session-wise)

Sequenced so confirmed P0 fixes ship first, then a safety net, then a sweep for
hidden bugs, then the two big features (Scenario 1 & 3).

Status legend: 🔴 Broken · 🟠 Needs improvement · 🔵 Suggestion · ⚪ Not started · 🟢 Working · ❓ Unverified
Priority: P0 blocks a whole feature · P1 subset/silent · P2 quality/polish · P3 cosmetic

## Overview

| # | Session | Priority | Effort | Test by opening | State |
|---|---------|----------|--------|-----------------|-------|
| S0 | Baseline test pass (no code) | — | S | every link | ☐ |
| S1 | Restore English tab + Exam key | P0/P1 | M | `/english`, `/exam` | ✅ done + live-tested + deployed |
| S1.5 | Task-based, real-world teaching content redesign | P1 | M | `/`, `/english`, `/exam` | ☐ research done, prompts not yet rewritten |
| S2 | Observability + smoke test net | P1 | M | `/owner` | ☐ |
| S3 | Sweep unverified (TV, owner, family, curriculum) | P1 | L | `/join/family01`, `/tv`, `/owner` | ☐ |
| S4 | Lifecycle & robustness polish | P2 | S | `/`, `/english` | ☐ |
| S5 | Scenario 1 — smart multi-subject read | P1 | M | `/` (4-subject photo) | ☐ |
| S6 | Scenario 3 — revision scheduler | P1 | L | `/exam`, `/owner` | ☐ |
| S7 | Consistency & cleanup (one AI client) | P2 | M | `/`, `/english`, `/exam` | ☐ |
| S8 | PDF polish + backlog + roadmap update | P2/P3 | S | `/`, `/roadmap` | ☐ |
| S1.7 | Exam input parity (upload JPG/PDF/PNG, scan, type, speak) | P1 | M | `/exam` | ✅ done + live-tested + deployed |

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

### S1 — Restore English tab + Exam key (in progress)
- `lib/apiClient.ts`: `arjunaFetch` defaults to POST when a `json` body is present.
- Add explicit `method:"POST"` at the 5 English call sites (belt + braces).
- `components/ExamHub.tsx`: route the 6 AI calls (timetable, material, revise×2, quiz×2) through the key-aware helper.
- **Verify:** `/english` (Learn/Words/Journal all work), `/exam` (works with own key in `/settings`).

### S1.5 — Task-based, real-world teaching content redesign
Pedagogy research (task-based learning, inquiry-based scaffolding, gamification effect
size in elementary kids, vocabulary/journaling via personal + imagery) applied to:
- **English concept sessions** (`buildEnglishConceptPrompt`): replace generic "give
  examples from a child's world" with a concrete Indian-kid scenario bank per
  grammar category (school bag labels, tiffin box, cricket team, street food,
  festivals, auto fare) wrapped as a mission the child completes, not a fact recited.
- **Homework teaching method** (`buildSystemPrompt` methodBlock): subject-specific
  real-world task banks (Maths → market/auto-fare counting, Science → everyday
  "why" questions, Telugu/Hindi → festival matching) instead of a static object list.
- **Exam revision & quiz** (`buildExamQuizPrompt`/`buildExamRevisionPrompt`): wrap the
  whole quiz as one escape-room/mission narrative (checkpoints) instead of 4 plain
  MCQs + 1 gamified bolt-on.
- **Daily Words & Journal** (`DAILY_WORDS_PROMPT`, `buildJournalListenPrompt`): tie
  every word/prompt to the child's own recent homework/day, one word per card,
  specific 2-line-answerable prompts instead of generic "write about your day."
- **Verify:** open a concept session, homework teach, exam quiz, and journal —
  each response should reference something a real Indian kid does, not a stock example.

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

### S2 — Observability + smoke test
- `console.error(realError)` in dev inside every AI `catch` (keep friendly UI text).
- `scripts/smoke.mjs` → POST every `/api/*` route; `npm run smoke`; wire to CI.
- Add a "Verified" state to this tracker.

### S3 — Sweep unverified areas
- Read + test `familyAuth`/`/api/family/*`, TV/`roomSync`, owner dashboard/analytics, curriculum engine (`teachingPlan`, `studentAgent`, `schoolAgent`, `bridgeSubject`, `memory`). Fix any P0 found.

### S4 — Lifecycle & robustness polish
- `TodayRing` reads in `useEffect`; clear celebrate `setTimeout`; harden streak day writes.

### S5 — Scenario 1: smart multi-subject read
- Surface extraction count + confidence; nudge "add the rest if I missed some"; use profile's usual subjects as expectation.

### S6 — Scenario 3: revision scheduler
- Per-child schedule store from term plan → weeks; reuse Vercel cron to auto-generate weekly quiz; spaced-revision queue at 20–30 days; parent reminder via `whatsapp.ts`/email placeholder.

### S7 — Consistency & cleanup
- One AI client everywhere; delete duplicate; drop unused prop; cap journal/daily-words storage.

### S8 — PDF polish + backlog + roadmap
- Use `reason:"pdf_unsupported"` for a sharper tip / per-page retry; update `/roadmap` (Spaced-repetition + Weekly-report → Shipped).
