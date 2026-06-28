import { getSupabaseServer } from "@/lib/supabase/server";
import type { LessonState } from "@/lib/lessonTypes";

const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

export function createRoomCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function createSupabaseRoom(
  initialState: Partial<LessonState>,
): Promise<{ code: string } | null> {
  const sb = getSupabaseServer();
  if (!sb) return null;

  let code = createRoomCode();
  for (let i = 0; i < 10; i++) {
    const { data: existing } = await sb
      .from("arjuna_rooms")
      .select("code")
      .eq("code", code)
      .maybeSingle();
    if (!existing) break;
    code = createRoomCode();
  }

  const { error } = await sb.from("arjuna_rooms").insert({
    code,
    state: initialState,
    tv_linked: false,
  });

  if (error) {
    console.error("createSupabaseRoom", error);
    return null;
  }

  return { code };
}

export async function getSupabaseRoom(code: string) {
  const sb = getSupabaseServer();
  if (!sb) return null;

  const { data, error } = await sb
    .from("arjuna_rooms")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error || !data) return null;

  const age = Date.now() - new Date(data.updated_at).getTime();
  if (age > ROOM_TTL_MS) {
    await sb.from("arjuna_rooms").delete().eq("code", code);
    return null;
  }

  return data as {
    code: string;
    state: LessonState;
    tv_linked: boolean;
    updated_at: string;
  };
}

export async function updateSupabaseRoom(
  code: string,
  patch: { state?: Partial<LessonState>; tv_linked?: boolean },
) {
  const sb = getSupabaseServer();
  if (!sb) return null;

  const existing = await getSupabaseRoom(code);
  if (!existing) return null;

  const nextState = patch.state
    ? { ...existing.state, ...patch.state, updatedAt: Date.now() }
    : existing.state;

  const { data, error } = await sb
    .from("arjuna_rooms")
    .update({
      state: nextState,
      tv_linked: patch.tv_linked ?? existing.tv_linked,
      updated_at: new Date().toISOString(),
    })
    .eq("code", code)
    .select("*")
    .single();

  if (error) return null;
  return data;
}

export async function markTvLinked(code: string) {
  return updateSupabaseRoom(code, { tv_linked: true });
}
