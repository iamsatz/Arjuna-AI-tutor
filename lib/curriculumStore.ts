import { getSupabaseServer } from "@/lib/supabase/server";
import type { CurriculumBoard } from "@/lib/childProfile";
import type {
  CurriculumSubject,
  SaveCurriculumInput,
  StoredCurriculum,
} from "@/lib/curriculumTypes";

function mapRow(row: Record<string, unknown>): StoredCurriculum {
  return {
    id: String(row.id),
    school_key: String(row.school_key),
    school_name: String(row.school_name),
    grade: String(row.grade),
    board: (row.board as CurriculumBoard | null) ?? null,
    term: (row.term as string | null) ?? null,
    subjects: Array.isArray(row.subjects)
      ? (row.subjects as CurriculumSubject[])
      : [],
    raw_text: (row.raw_text as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

export async function getCurriculumBySchoolKey(
  schoolKey: string,
): Promise<StoredCurriculum | null> {
  const sb = getSupabaseServer();
  if (!sb) return null;

  const { data, error } = await sb
    .from("arjuna_curricula")
    .select("*")
    .eq("school_key", schoolKey)
    .maybeSingle();

  if (error || !data) return null;
  return mapRow(data);
}

export async function saveCurriculum(
  input: SaveCurriculumInput,
): Promise<StoredCurriculum | null> {
  const sb = getSupabaseServer();
  if (!sb) return null;

  const { data, error } = await sb
    .from("arjuna_curricula")
    .upsert(
      {
        school_key: input.schoolKey,
        school_name: input.schoolName,
        grade: input.grade,
        board: input.board ?? null,
        term: input.term ?? null,
        subjects: input.subjects,
        raw_text: input.rawText ?? null,
      },
      { onConflict: "school_key" },
    )
    .select("*")
    .single();

  if (error || !data) {
    console.error("saveCurriculum", error);
    return null;
  }

  return mapRow(data);
}
