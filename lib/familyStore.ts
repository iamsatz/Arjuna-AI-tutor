import type { CurriculumBoard } from "@/lib/childProfile";
import { getSupabaseServer } from "@/lib/supabase/server";

export type FamilyChild = {
  id: string;
  inviteCode: string;
  childName: string;
  grade?: string;
  board?: CurriculumBoard;
  createdAt: string;
};

export type FamilyInviteMeta = {
  code: string;
  label?: string;
  setupComplete: boolean;
  children: FamilyChild[];
};

const MAX_FAMILY_CHILDREN = 3;

function normalizeCode(code: string): string {
  return code.trim().toLowerCase();
}

function mapChildRow(row: Record<string, unknown>): FamilyChild {
  return {
    id: String(row.id),
    inviteCode: String(row.invite_code ?? row.inviteCode),
    childName: String(row.child_name ?? row.childName),
    grade: (row.grade as string | null) ?? undefined,
    board: (row.board as FamilyChild["board"] | null) ?? undefined,
    createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
  };
}

export async function getFamilyInviteMeta(
  code: string,
): Promise<FamilyInviteMeta | null> {
  const normalized = normalizeCode(code);
  const sb = getSupabaseServer();
  if (!sb) return null;

  const { data: invite, error: inviteError } = await sb
    .from("arjuna_invites")
    .select("code, label, setup_complete")
    .eq("code", normalized)
    .maybeSingle();

  if (inviteError || !invite) {
    if (inviteError) console.error("getFamilyInviteMeta invite", inviteError);
    return null;
  }

  const { data: children, error: childError } = await sb
    .from("arjuna_family_children")
    .select("*")
    .eq("invite_code", normalized)
    .order("created_at", { ascending: true });

  if (childError) {
    console.error("getFamilyInviteMeta children", childError);
  }

  return {
    code: String(invite.code),
    label: (invite.label as string | null) ?? undefined,
    setupComplete: Boolean(invite.setup_complete),
    children: (children ?? []).map(mapChildRow),
  };
}

export async function listFamilyChildren(code: string): Promise<FamilyChild[]> {
  const meta = await getFamilyInviteMeta(code);
  return meta?.children ?? [];
}

export async function setupFamily(
  code: string,
  child: {
    childName: string;
    grade?: string;
    board?: CurriculumBoard;
  },
): Promise<{ ok: true; child: FamilyChild } | { ok: false; error: string }> {
  const normalized = normalizeCode(code);
  const sb = getSupabaseServer();
  if (!sb) return { ok: false, error: "database_unavailable" };

  const meta = await getFamilyInviteMeta(normalized);
  if (!meta) return { ok: false, error: "not_found" };
  if (meta.setupComplete) return { ok: false, error: "already_setup" };

  const now = new Date().toISOString();

  // Insert child first — only mark setup complete after child is saved.
  const { data, error: childError } = await sb
    .from("arjuna_family_children")
    .insert({
      invite_code: normalized,
      child_name: child.childName.trim(),
      grade: child.grade ?? null,
      board: child.board ?? null,
    })
    .select("*")
    .single();

  if (childError || !data) {
    console.error("setupFamily child", childError);
    return { ok: false, error: "save_failed" };
  }

  const { error: inviteError } = await sb
    .from("arjuna_invites")
    .update({
      setup_complete: true,
      child_name: child.childName.trim(),
      grade: child.grade ?? null,
      board: child.board ?? null,
      claimed_at: now,
    })
    .eq("code", normalized);

  if (inviteError) {
    console.error("setupFamily invite", inviteError);
    return { ok: false, error: "save_failed" };
  }

  return { ok: true, child: mapChildRow(data) };
}

export async function addFamilyChild(
  code: string,
  child: {
    childName: string;
    grade?: string;
    board?: CurriculumBoard;
  },
): Promise<
  | { ok: true; child: FamilyChild }
  | { ok: false; error: "max_children" | "duplicate_name" | "save_failed" | "not_found" }
> {
  const normalized = normalizeCode(code);
  const existing = await listFamilyChildren(normalized);
  if (existing.length >= MAX_FAMILY_CHILDREN) {
    return { ok: false, error: "max_children" };
  }

  const nameKey = child.childName.trim().toLowerCase();
  if (existing.some((c) => c.childName.trim().toLowerCase() === nameKey)) {
    return { ok: false, error: "duplicate_name" };
  }

  const sb = getSupabaseServer();
  if (!sb) return { ok: false, error: "save_failed" };

  const { data, error } = await sb
    .from("arjuna_family_children")
    .insert({
      invite_code: normalized,
      child_name: child.childName.trim(),
      grade: child.grade ?? null,
      board: child.board ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("addFamilyChild", error);
    return { ok: false, error: "save_failed" };
  }

  return { ok: true, child: mapChildRow(data) };
}

export { MAX_FAMILY_CHILDREN };
