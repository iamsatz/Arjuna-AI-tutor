# Arjuna

Voice-first homework tutor for kids. Share invite links from the owner dashboard.

## Phases (interactive family loop)

| Phase | Env | What works |
|---|---|---|
| **V0** (default) | `NEXT_PUBLIC_ARJUNA_PHASE=v0` | Greeting + speaker test only |
| **Alpha** | `NEXT_PUBLIC_ARJUNA_PHASE=alpha` | Talk + Photo (+ `GEMINI_API_KEY`) |

## Quick start

```bash
cp .env.example .env.local
# SARVAM_API_KEY required
# NEXT_PUBLIC_ARJUNA_PHASE=v0  (default)

npm install
npm run dev
```

Open http://localhost:3000 — expand **For parents · V0 steps** at bottom to track family validation.

## Unlock Alpha (after V0 gate)

1. Complete all steps in app parent panel + sign [`V0-GATE.md`](../arjuna-prd/V0-GATE.md)
2. Set in `.env.local`:
   ```
   NEXT_PUBLIC_ARJUNA_PHASE=alpha
   GEMINI_API_KEY=...
   ```
3. Restart `npm run dev`
4. Log first trial in [`alpha-trial-1.md`](../arjuna-prd/OBSERVATIONS/alpha-trial-1.md)

## Docs

- Phase roadmap: [`V0-ROADMAP.md`](../arjuna-prd/V0-ROADMAP.md)
- WoZ guide: [`V0-WOZ-GUIDE.md`](../arjuna-prd/OBSERVATIONS/V0-WOZ-GUIDE.md)
