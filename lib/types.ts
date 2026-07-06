export type HomeworkTask = {
  subject: string;
  task: string;
  notes?: string;
  /** Gemini flagged subject as a guess — parent should confirm. */
  subjectUncertain?: boolean;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type TeachingMode = "general" | "dictation" | "readalong";

export type SessionMeta = {
  startedAt: number;
  tasks: HomeworkTask[];
  currentTaskIndex: number;
  mode: TeachingMode;
  strikesOnTask: number;
  photoAttempts: number;
  dictationProgress: number;
  highlights: string[];
  struggles: string[];
  askAmmaFlags: string[];
};

export function createSessionMeta(): SessionMeta {
  return {
    startedAt: Date.now(),
    tasks: [],
    currentTaskIndex: 0,
    mode: "general",
    strikesOnTask: 0,
    photoAttempts: 0,
    dictationProgress: 0,
    highlights: [],
    struggles: [],
    askAmmaFlags: [],
  };
}
