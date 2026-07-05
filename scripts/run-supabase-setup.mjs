/**
 * Prints migration steps and optionally seeds invites.
 * Usage: node --env-file=.env.local scripts/run-supabase-setup.mjs
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log(`
=== Arjuna Supabase setup ===

1. Open Supabase SQL editor for your project
2. Run migrations in order:
   - supabase/migrations/001_arjuna_mvp.sql
   - supabase/migrations/002_family_access.sql
3. Add Vercel env vars on arjuna-ai-tutor.vercel.app:
   GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
   NEXT_PUBLIC_ARJUNA_PHASE, SARVAM_API_KEY, OWNER_PASSWORD
4. Redeploy Vercel

This script will seed invites after migrations exist.
`);

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const invites = JSON.parse(
  readFileSync(new URL("../data/invites.json", import.meta.url), "utf8"),
);

const sb = createClient(url, key);

for (const invite of invites) {
  const { error } = await sb.from("arjuna_invites").upsert(
    {
      code: invite.code,
      label: invite.label ?? null,
    },
    { onConflict: "code" },
  );
  if (error) {
    console.error(`Seed failed for ${invite.code}:`, error.message);
    console.error("Run migrations 001 and 002 in Supabase SQL editor first.");
    process.exit(1);
  }
  console.log("OK", invite.code, invite.label);
}

console.log(`Synced ${invites.length} invites.`);
