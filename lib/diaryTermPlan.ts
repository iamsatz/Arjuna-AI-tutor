import type { DiaryTermPlan } from "@/lib/gemini";
import { saveCurriculum } from "@/lib/curriculumStore";
import type { CurriculumBoard } from "@/lib/childProfile";
import type { CurriculumSubject } from "@/lib/curriculumTypes";

export function diaryTermToSubjects(
  termPlan: DiaryTermPlan,
): CurriculumSubject[] {
  return termPlan.subjects.map((s) => ({
    subject: s.subject,
    topics: s.topics.map((name) => ({ name })),
  }));
}

export async function cacheDiaryTermPlan(opts: {
  schoolKey: string;
  schoolName: string;
  grade: string;
  board?: CurriculumBoard;
  termPlan: DiaryTermPlan;
}): Promise<boolean> {
  const subjects = diaryTermToSubjects(opts.termPlan);
  if (!subjects.length) return false;

  const saved = await saveCurriculum({
    schoolKey: opts.schoolKey,
    schoolName: opts.schoolName,
    grade: opts.grade,
    board: opts.board,
    term: opts.termPlan.term ?? "From diary",
    subjects,
    rawText: "Extracted from student diary",
  });

  return Boolean(saved);
}
