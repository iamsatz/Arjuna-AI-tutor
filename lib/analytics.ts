import type { DeviceMode, LanguageMode } from "@/lib/settings";
import { isTvDevice } from "@/lib/platform";

export type AnalyticsEventType =
  | "app_open"
  | "session_start"
  | "session_end"
  | "homework_input"
  | "task_started"
  | "explain_again"
  | "doubt_submitted"
  | "example_given"
  | "understood"
  | "answer_verified"
  | "parent_unlock"
  | "task_completed"
  | "session_completed"
  | "exam_created"
  | "exam_material_uploaded"
  | "exam_revision_started"
  | "exam_quiz_started"
  | "exam_quiz_answer";

type TrackContext = {
  deviceMode?: DeviceMode;
  inviteCode?: string;
  childName?: string;
  languageMode?: LanguageMode;
};

let context: TrackContext = {};

export function setAnalyticsContext(next: TrackContext): void {
  context = { ...context, ...next };
}

export async function track(
  eventType: AnalyticsEventType,
  payload: Record<string, unknown> = {},
): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType,
        device: isTvDevice() ? "tv" : "phone",
        deviceMode: context.deviceMode,
        inviteCode: context.inviteCode,
        childName: context.childName,
        languageMode: context.languageMode,
        payload: {
          ...payload,
          timeOfDay: new Date().getHours(),
        },
      }),
    });
  } catch {
    // Analytics must never block the lesson flow.
  }
}
