import type { CurriculumBoard } from "@/lib/childProfile";

export type StoredExam = {
  id: string;
  invite_code: string;
  profile_id: string | null;
  child_name: string;
  subject: string;
  board: CurriculumBoard | null;
  grade: string | null;
  exam_date: string | null;
  topics: string[];
  concept_notes: string | null;
  page_count: number;
  status: "draft" | "ready";
  created_at: string;
  updated_at: string;
};

export type CreateExamInput = {
  inviteCode: string;
  childName: string;
  profileId?: string;
  subject: string;
  board?: CurriculumBoard;
  grade?: string;
  examDate?: string;
  topics?: string[];
  conceptNotes?: string;
  pageCount?: number;
  status?: "draft" | "ready";
};

export type ExamQuizQuestion = {
  id: string;
  type: "mcq" | "gamified";
  prompt: string;
  options: string[];
  correctIndex: number;
  concept: string;
};
