import type { CurriculumBoard } from "@/lib/childProfile";

export type CurriculumTopic = {
  name: string;
  resources?: string;
};

export type CurriculumSubject = {
  subject: string;
  topics: CurriculumTopic[];
};

export type StoredCurriculum = {
  id: string;
  school_key: string;
  school_name: string;
  grade: string;
  board: CurriculumBoard | null;
  term: string | null;
  subjects: CurriculumSubject[];
  raw_text: string | null;
  created_at: string;
};

export type SaveCurriculumInput = {
  schoolKey: string;
  schoolName: string;
  grade: string;
  board?: CurriculumBoard;
  term?: string;
  subjects: CurriculumSubject[];
  rawText?: string;
};

export function topicsToConceptNotes(
  subject: string,
  topics: CurriculumTopic[],
): string {
  if (!topics.length) {
    return `- ${subject}: general revision from school term plan`;
  }
  return topics
    .map((t) =>
      t.resources
        ? `- ${t.name}: ${t.resources}`
        : `- ${t.name}: topic from school term plan`,
    )
    .join("\n");
}
