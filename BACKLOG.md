# Backlog — Arjuna

Everything found in the 2026-08-13 full code review, plus carry-over from
`docs/SESSIONS.md`. The task list only ever holds the session being actively
worked (max 3 critical tasks); this file holds the rest.

Sessions are sequenced in `/Users/apple/.claude/plans/no-pins-for-now-wiggly-shamir.md`.

**Status values:** `Open`, `In Progress`, `Done`, `Blocked`

---

## 🚧 Blocked on account owner — nothing AI-backed works until these are done

| Task | Platform | Model | Status |
|---|---|---|---|
| **Issue a real Gemini API key** — current `.env.local` value is prefix `AQ.`, 53 chars = an OAuth 2.0 access token, not an AI Studio key (`AIza…`, 39 chars). Live call returns 401. OAuth tokens also expire hourly. Get a key from Google AI Studio, and rotate the existing token — it was printed to a session transcript | Desktop | — | Blocked |
| **Recreate the Supabase project** — `shikwtguxfhefzvfkedo.supabase.co` returns DNS NXDOMAIN; the project is gone. Blocks *all* TV pairing (room sync is entirely Supabase Realtime), plus invites, exams, student memory, events. After creating: set URL + anon key in `.env.local`, then `npm run supabase:setup` | Desktop | — | Blocked |
| **Set the same vars in Vercel** (Production scope) then redeploy — `docs/SESSIONS.md` flagged this in July and it is still unresolved | Desktop | — | Blocked |

---

## High Priority

| Task | Platform | Model | Status |
|---|---|---|---|
| **Strip every PIN** — removed `parentPin`/`verifyParentPin`, the settings field, `pinInput` state and forms in `useLessonSession`/`LessonScreen`/`ExamHub`, and `/api/solution` entirely (route deleted, returns 404). Full-answer reveal is gone from the child's device; `parent_needed` now shows an "ask Amma or Nanna" card. Quiz feedback replaced with server-side grading — `correctIndex` never reaches the browser, and a wrong answer says "not quite" without revealing the right option. KidSwitcher delete now uses a typed-name confirm | Web | Opus | **Done** (S1) |
| **Gate every mutating/AI route** — new `lib/apiAuth.ts` `requireInvite()` applied to 20+ routes. Live-verified: 401 with no header, 401 with an invalid code, normal validation with a valid one | Web | Opus | **Done** (S1) |
| **Secure `/api/summary`** — verified 401 without a valid invite; the family can no longer be WhatsApp-spammed by anyone with the URL | Web | Sonnet | **Done** (S1) |
| **Stop sending the Gemini key in request bodies** — `arjunaFetch` is header-only now; `geminiApiKey` removed from every route body type, `resolveGeminiKeyFromBody` deleted, and `/api/gemini-test` takes the key under test via `x-gemini-key` | Web | Sonnet | **Done** (S1) |
| **Extraction at `temperature: 0` + JSON response mode** — `geminiGenerate` (`lib/gemini.ts:45-57`) hardcodes `temperature: 0.7` for every caller including all JSON extraction (diary, timetable, curriculum, quiz). Thread a per-call config; add `responseMimeType: "application/json"` and one reprompt retry when `parseJson` (`:93`) throws. Cheapest accuracy win in the repo | Web | Opus | Open |
| **Fix double `pushState`** — `patchState` (`hooks/useLessonSession.ts:170-189`) publishes twice per patch when `externalState` is set: once inside the `setState` updater and once below it | Web | Opus | Open |
| **Pass `readOnly` to the TV** — `TvLessonScreen` (`:93,154`) renders `<LessonScreen controller="tv" externalState={state} />` with no `readOnly`, so the TV shows the full interactive phone UI *and* both devices call `playSpeech()` → doubled, desynced audio | Web | Opus | Open |
| **Move `sessionsStore` to Supabase** — `lib/sessionsStore.ts:31` does `fs.writeFile`, which throws on Vercel's read-only FS. It also runs *after* the WhatsApp send in `/api/summary`, so messages go out and the request then 502s. Follow the `lib/examStore.ts` pattern. Also has a read-modify-write race and unbounded file growth | Web | Opus | Open |
| **Answer-leakage filter on chat output** — `chatWithArjuna` (`lib/gemini.ts:98`) returns raw model text; the only post-processing anywhere is the cosmetic `stripSpeechMarkers`. PRD §11.5 claims a filter exists. Highest-risk once worksheet upload ships | Web | Opus | Open |
| **25-minute session cap** — PRD F10 and the system prompt both assert it; no timer exists anywhere. Warn at 20 and 22 min, then close cleanly | Web | Opus | Open |
| **Renumber duplicate migrations** — `002_arjuna_feedback.sql` and `002_family_access.sql` share a number; apply order is undefined. Must be fixed *before* applying to the new Supabase project | Web | Sonnet | Open |

## Medium Priority

| Task | Platform | Model | Status |
|---|---|---|---|
| **Build a real TV lesson view** — no TV-specific UI exists; the TV renders the phone screen. New `TvLessonView` for `controller === "tv"`: full-bleed `ArjunaAvatar`, current question in large type, progress, Arjuna's spoken line. Reuse `ui/ProgressRing`, `ui/StepDots`, `ui/LessonProgress`. This is also the stage for the planned animated character | Desktop | Opus | Open |
| **Remote controls on the lesson** — four large `<button>`s (Repeat · Next · I understood · Didn't understand) using the existing `.tv-focus` class + initial `focus()`. Android TV's WebView maps D-pad to native focus on buttons, so no JS focus manager is needed — the pairing keypad already proves this works | Desktop | Opus | Open |
| **Conversational extraction fallback** *(the main challenge)* — a failed read currently drops into a silent form behind four small underlined links (`components/HomeworkCaptureTray.tsx:63-98`). Arjuna should *speak*: "I couldn't read that — tell me what the homework is", then accept voice or typing from parent or child on either device. Reuses `transcribeToText` (`hooks/useLessonSession.ts:600`), the text path of `/api/extract-tasks`, and `openManualReview` | Desktop | Opus | Open |
| **Confirm before teaching** — read extracted tasks aloud and let parent/child confirm or correct before the lesson starts (PRD F7, currently "Partial"). `HomeworkTaskReview` has the edit UI already; needs voice read-back and TV-visible confirmation | Desktop | Opus | Open |
| **First-launch "TV or phone?" picker** — `isTvDevice()` (`lib/platform.ts:1`) sniffs the UA for `tv`/`leanback`/`aft`/`androidtv`/`crkey`. A Capacitor WebView on a generic Android TV box matches none of these, while Fire TV matches `aft` — so TV detection fails *inconsistently by device*. Ask once, persist to the existing `deviceMode` setting | Desktop | Opus | Open |
| **Normalise `pure_telugu` copy** — mixes Telugu script and romanised Telugu in the same strings (`hooks/useLessonSession.ts:844,903`; compare `localizedCopy` at `:48-77` against `buildGreeting`). Sarvam TTS pronounces these three different ways | Web | Opus | Open |
| **Room security** — `/api/room/supabase` PATCH is unauthenticated and codes are 4 digits, so any room's state can be overwritten by guessing. Add expiry + bind writes to the auth gate | Web | Opus | Open |
| **Extend `scripts/smoke.mjs`** — cover upload → extract → fallback → teach → TV mirror | Web | Sonnet | Open |
| **Gemini 429 handling** — `geminiGenerate` (`lib/gemini.ts:86`) only falls back to the next model on 404/503; a 429 throws immediately and the raw Google error body is returned to the browser via `message` | Web | Sonnet | Open |
| **Enforce a monthly spend ceiling** — PRD sets a ₹500/month hard stop with no mechanism. No rate limiting exists on any route | Web | Opus | Open |

## Quick Wins

| Task | Platform | Model | Status |
|---|---|---|---|
| **Add an ESLint config** — none exists in `arjuna/`, so `npm run lint` drops into interactive setup and has never run. One exists at `arjuna-prd/arjuna/eslint.config.mjs` to copy | Web | Sonnet | Open |
| **Remove dead `buildGreeting` import** — `hooks/useLessonSession.ts:9`, unused. Proof that lint has never run | Web | Sonnet | Open |
| **Retire `data-focusable`** — attribute is set in `TvLessonScreen` but no keydown handler or focus manager reads it anywhere; native focus order does the work. Remove it or make it meaningful | Web | Sonnet | Open |
| **Add a Sarvam check to `/api/health`** — the endpoint already checks Supabase and Gemini (and logs failures for the owner on a Vercel cron), but not voice. Note: the Sarvam key *is* valid (`GET /v1/models` → 200); its `POST /text-to-speech` 403 needs separate investigation | Web | Sonnet | Open |
| **`loadSettings()` re-runs every render** — `hooks/useLessonSession.ts:96` reads localStorage on each render. Also listed as defect #10 in `docs/SESSIONS.md` (still open) | Web | Sonnet | Open |
| **Stale closure in the unmount effect** — `hooks/useLessonSession.ts:1005-1023` has an empty dep array but reads `activeState.sessionStartedAt` | Web | Sonnet | Open |
| **Don't inject instructions as the child's words** — `teachCurrentTask` (`:255-261`) appends `"Teach this task: …"` as `role: "user"`, and `chatWithArjuna` renders history as `${childName}: ${content}`, so the model sees the child issuing tutor directives. Move to `contextNote` | Web | Sonnet | Open |
| **`/api/family/[code]/verify` is a self-labelled legacy route** — returns the child list for any valid invite code with no further credential. Decide: keep, document, or delete | Web | Sonnet | Open |

## Low Priority

| Task | Platform | Model | Status |
|---|---|---|---|
| **Wire the WhatsApp parent summary** — `/api/summary` is fully written but nothing calls it; `session_done` (`hooks/useLessonSession.ts:899`) renders an exam-prep upsell instead (`components/LessonScreen.tsx:754`). Out of MVP scope by decision; needs WhatsApp Cloud API token, phone ID, both parent numbers, and Meta approval | Web | Opus | Open |
| **Reconcile `ARJUNA-PRD.md` with reality** — the PRD is ~1 major version stale. It documents files that don't exist (`lib/roomStore.ts`, `hooks/useArjunaSession.ts`, `hooks/useRoomSync.ts`, `components/ArjunaScreen.tsx`, `V0ProgressPanel.tsx`, `/api/room`, `/api/room/[code]`), omits entire shipped modules (exam, English, curriculum, family access, answer verification, agent layer, `lib/memory.ts`), and contradicts itself — Principle #4 forbids streaks/badges while `lib/streak.ts` + `lib/badges.ts` ship and are wired into four components; §7.4 lists cross-session memory and exam prep as out of scope while both are built | Web | Opus | Open |
| **Silence check-ins (90s / 150s / 300s)** — PRD F8; no silence detection exists | Web | Opus | Open |
| **Photo retry limit** — PRD F12; `photoAttempts` exists as a field in `lib/types.ts` but no counter logic or escalation is wired | Web | Sonnet | Open |
| **Red-flag safety detector** — PRD §5.7; no implementation at all | Web | Opus | Open |
| **Remove the committed APK** — `public/Arjuna-latest.apk` is tracked in git | Web | Sonnet | Open |
| **pdfjs worker loads from unpkg CDN** — `lib/pdfToImages.ts:10`; breaks offline/in-APK and is a third-party call absent from the PRD's privacy table | Web | Sonnet | Open |
| **DPDP consent flow** — named in PRD §11.6, not implemented | Web | Opus | Open |
| **Instrument the §12.1 success metrics** — none are measurable today (parent minutes saved, session completion rate) | Web | Opus | Open |
