import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { getSupabaseServer } from "@/lib/supabase/server";

export type StoredInvite = {
  code: string;
  label?: string;
  createdAt: string;
  childName?: string;
  grade?: string;
  board?: "CBSE" | "ICSE" | "IB" | "State";
  claimedAt?: string;
};

const INVITES_PATH = path.join(process.cwd(), "data", "invites.json");

function isProduction(): boolean {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}

function mapRow(row: Record<string, unknown>): StoredInvite {
  return {
    code: String(row.code),
    label: (row.label as string | null) ?? undefined,
    createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
    childName: (row.child_name as string | null) ?? (row.childName as string | undefined),
    grade: (row.grade as string | null) ?? undefined,
    board: (row.board as StoredInvite["board"] | null) ?? undefined,
    claimedAt: (row.claimed_at as string | null) ?? (row.claimedAt as string | undefined),
  };
}

function normalizeCode(code: string): string {
  return code.trim().toLowerCase();
}

async function readInvitesFromFile(): Promise<StoredInvite[]> {
  try {
    const raw = await fs.readFile(INVITES_PATH, "utf-8");
    const parsed = JSON.parse(raw) as StoredInvite[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeInvitesToFile(invites: StoredInvite[]): Promise<void> {
  await fs.mkdir(path.dirname(INVITES_PATH), { recursive: true });
  await fs.writeFile(INVITES_PATH, JSON.stringify(invites, null, 2));
}

async function readInvitesFromSupabase(): Promise<StoredInvite[] | null> {
  const sb = getSupabaseServer();
  if (!sb) return null;

  const { data, error } = await sb
    .from("arjuna_invites")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("readInvitesFromSupabase", error);
    return null;
  }

  return (data ?? []).map(mapRow);
}

export async function readInvites(): Promise<StoredInvite[]> {
  const fromSupabase = await readInvitesFromSupabase();
  if (fromSupabase) return fromSupabase;
  return readInvitesFromFile();
}

async function generateUniqueCode(
  existing: StoredInvite[],
): Promise<string> {
  let code = "";
  do {
    code = randomBytes(4).toString("hex");
  } while (existing.some((invite) => invite.code === code));
  return code;
}

export async function createInvite(label?: string): Promise<StoredInvite> {
  const sb = getSupabaseServer();

  if (sb) {
    const existing = (await readInvitesFromSupabase()) ?? [];
    const code = await generateUniqueCode(existing);
    const invite: StoredInvite = {
      code,
      label: label?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const { error } = await sb.from("arjuna_invites").insert({
      code: invite.code,
      label: invite.label ?? null,
    });

    if (!error) return invite;
    console.error("createInvite supabase", error);
    if (isProduction()) {
      throw new Error(
        "Could not save invite to database. Check Supabase migration (arjuna_invites table).",
      );
    }
  } else if (isProduction()) {
    throw new Error(
      "Database not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY on Vercel.",
    );
  }

  const invites = await readInvitesFromFile();
  const code = await generateUniqueCode(invites);
  const invite: StoredInvite = {
    code,
    label: label?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  invites.unshift(invite);
  await writeInvitesToFile(invites);
  return invite;
}

export async function getInviteByCode(
  code: string,
): Promise<StoredInvite | null> {
  const normalized = normalizeCode(code);
  if (!normalized) return null;

  const sb = getSupabaseServer();
  if (sb) {
    const { data, error } = await sb
      .from("arjuna_invites")
      .select("*")
      .eq("code", normalized)
      .maybeSingle();

    if (error) {
      console.error("getInviteByCode supabase", error);
    } else if (data) {
      return mapRow(data);
    }
  }

  const invites = await readInvitesFromFile();
  return invites.find((invite) => invite.code === normalized) ?? null;
}

export async function claimInvite(
  code: string,
  childName: string,
  grade?: string,
  board?: StoredInvite["board"],
): Promise<StoredInvite | null> {
  const normalized = normalizeCode(code);
  const existing = await getInviteByCode(normalized);
  if (!existing) return null;

  const updated: StoredInvite = {
    ...existing,
    childName: childName.trim(),
    grade: grade?.trim() || undefined,
    board: board || undefined,
    claimedAt: existing.claimedAt ?? new Date().toISOString(),
  };

  const sb = getSupabaseServer();
  if (sb) {
    const { data, error } = await sb
      .from("arjuna_invites")
      .update({
        child_name: updated.childName,
        grade: updated.grade ?? null,
        board: updated.board ?? null,
        claimed_at: updated.claimedAt,
      })
      .eq("code", normalized)
      .select("*")
      .single();

    if (!error && data) return mapRow(data);
    if (error) console.error("claimInvite supabase", error);
    if (isProduction()) return updated;
  }

  try {
    const invites = await readInvitesFromFile();
    const index = invites.findIndex((invite) => invite.code === normalized);
    if (index !== -1) {
      invites[index] = updated;
      await writeInvitesToFile(invites);
    }
  } catch (error) {
    console.error("claimInvite file", error);
  }

  return updated;
}
