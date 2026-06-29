import { getSupabaseServer } from "@/lib/supabase/server";
import type { CurriculumBoard } from "@/lib/childProfile";
import type { CreateExamInput, StoredExam } from "@/lib/examTypes";

export type { StoredExam, CreateExamInput, ExamQuizQuestion } from "@/lib/examTypes";

function mapRow(row: Record<string, unknown>): StoredExam {
  return {
    id: String(row.id),
    invite_code: String(row.invite_code),
    child_name: String(row.child_name),
    subject: String(row.subject),
    board: (row.board as CurriculumBoard | null) ?? null,
    grade: (row.grade as string | null) ?? null,
    exam_date: (row.exam_date as string | null) ?? null,
    topics: Array.isArray(row.topics) ? (row.topics as string[]) : [],
    concept_notes: (row.concept_notes as string | null) ?? null,
    page_count: Number(row.page_count ?? 0),
    status: (row.status as StoredExam["status"]) ?? "draft",
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function createExam(input: CreateExamInput): Promise<StoredExam | null> {
  const sb = getSupabaseServer();
  if (!sb) return null;

  const { data, error } = await sb
    .from("arjuna_exams")
    .insert({
      invite_code: input.inviteCode,
      child_name: input.childName,
      subject: input.subject,
      board: input.board ?? null,
      grade: input.grade ?? null,
      exam_date: input.examDate ?? null,
      topics: input.topics ?? [],
      concept_notes: input.conceptNotes ?? null,
      page_count: input.pageCount ?? 0,
      status: input.status ?? "draft",
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("createExam", error);
    return null;
  }

  return mapRow(data);
}

export async function listExamsByInvite(
  inviteCode: string,
  childName?: string,
): Promise<StoredExam[]> {
  const sb = getSupabaseServer();
  if (!sb) return [];

  let query = sb.from("arjuna_exams").select("*").eq("invite_code", inviteCode);

  if (childName?.trim()) {
    query = query.eq("child_name", childName.trim());
  }

  const { data, error } = await query
    .order("exam_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("listExamsByInvite", error);
    return [];
  }

  return data.map(mapRow);
}

export async function getExamById(id: string): Promise<StoredExam | null> {
  const sb = getSupabaseServer();
  if (!sb) return null;

  const { data, error } = await sb
    .from("arjuna_exams")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapRow(data);
}

export async function updateExam(
  id: string,
  patch: Partial<{
    subject: string;
    examDate: string;
    topics: string[];
    conceptNotes: string;
    pageCount: number;
    status: "draft" | "ready";
  }>,
): Promise<StoredExam | null> {
  const sb = getSupabaseServer();
  if (!sb) return null;

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.subject !== undefined) update.subject = patch.subject;
  if (patch.examDate !== undefined) update.exam_date = patch.examDate;
  if (patch.topics !== undefined) update.topics = patch.topics;
  if (patch.conceptNotes !== undefined) update.concept_notes = patch.conceptNotes;
  if (patch.pageCount !== undefined) update.page_count = patch.pageCount;
  if (patch.status !== undefined) update.status = patch.status;

  const { data, error } = await sb
    .from("arjuna_exams")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("updateExam", error);
    return null;
  }

  return mapRow(data);
}
