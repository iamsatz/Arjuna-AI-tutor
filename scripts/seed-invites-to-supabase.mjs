/**
 * Sync data/invites.json into Supabase arjuna_invites.
 * Run after migration: node --env-file=.env.local scripts/seed-invites-to-supabase.mjs
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY");
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
    console.error(`Failed ${invite.code}:`, error.message);
    process.exit(1);
  }
  console.log("OK", invite.code, invite.label);
}

console.log(`Synced ${invites.length} invites to Supabase.`);
