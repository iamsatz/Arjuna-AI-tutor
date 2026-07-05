import type { AvatarState } from "@/lib/avatar";
import type { ChatMessage, HomeworkTask } from "@/lib/types";
import type { DeviceMode, LanguageMode } from "@/lib/settings";

export type LessonPhase =
  | "input"
  | "task_intro"
  | "ask_explain"
  | "ask_help_mode"
  | "try_self"
  | "capture_answer"
  | "verify_result"
  | "teaching"
  | "doubt"
  | "parent_needed"
  | "parent_solution"
  | "exam_prep"
  | "session_done";

export type LessonState = {
  code: string | null;
  deviceMode: DeviceMode;
  childName: string;
  grade?: string;
  inviteCode?: string;
  languageMode: LanguageMode;
  tasks: HomeworkTask[];
  currentTaskIndex: number;
  currentExplanation: string;
  attemptCount: number;
  verifyAttemptCount: number;
  lastVerifyCorrect?: boolean;
  phase: LessonPhase;
  statusMessage: string;
  avatarState: AvatarState;
  lastReply: string;
  sessionStartedAt: number;
  messages: ChatMessage[];
  doubtText?: string;
  parentSolution?: string;
  controller: "phone" | "tv";
  updatedAt: number;
};

export function createInitialLessonState(
  childName: string,
  opts: {
    grade?: string;
    inviteCode?: string;
    languageMode: LanguageMode;
    deviceMode: DeviceMode;
    controller: "phone" | "tv";
  },
): LessonState {
  return {
    code: null,
    deviceMode: opts.deviceMode,
    childName,
    grade: opts.grade,
    inviteCode: opts.inviteCode,
    languageMode: opts.languageMode,
    tasks: [],
    currentTaskIndex: 0,
    currentExplanation: "",
    attemptCount: 0,
    verifyAttemptCount: 0,
    phase: "input",
    statusMessage: "Add homework to start",
    avatarState: "idle",
    lastReply: "",
    sessionStartedAt: Date.now(),
    messages: [],
    controller: opts.controller,
    updatedAt: Date.now(),
  };
}
