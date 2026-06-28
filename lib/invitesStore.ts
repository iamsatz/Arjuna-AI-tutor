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

export async function createInvite(label?: string): Promise<StoredInvite> {
  const sb = getSupabaseServer();
  let code = "";

  if (sb) {
    const existing = await readInvitesFromSupabase();
    if (existing) {
      do {
        code = randomBytes(4).toString("hex");
      } while (existing.some((invite) => invite.code === code));

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
    }
  }

  const invites = await readInvitesFromFile();
  do {
    code = randomBytes(4).toString("hex");
  } while (invites.some((invite) => invite.code === code));

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
  const sb = getSupabaseServer();
  if (sb) {
    const { data, error } = await sb
      .from("arjuna_invites")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (!error && data) return mapRow(data);
  }

  const invites = await readInvitesFromFile();
  return invites.find((invite) => invite.code === code) ?? null;
}

export async function claimInvite(
  code: string,
  childName: string,
  grade?: string,
  board?: StoredInvite["board"],
): Promise<StoredInvite | null> {
  const existing = await getInviteByCode(code);
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
      .eq("code", code)
      .select("*")
      .single();

    if (!error && data) return mapRow(data);
    if (error) console.error("claimInvite supabase", error);
  }

  const invites = await readInvitesFromFile();
  const index = invites.findIndex((invite) => invite.code === code);
  if (index === -1) return null;

  invites[index] = updated;
  await writeInvitesToFile(invites);
  return updated;
}
