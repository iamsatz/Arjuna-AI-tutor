import type { HomeworkTask } from "@/lib/types";

export type ReviewableTask = {
  id: string;
  subject: string;
  task: string;
  notes?: string;
  selected: boolean;
};

export function newReviewTaskId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function homeworkToReviewable(tasks: HomeworkTask[]): ReviewableTask[] {
  return tasks.map((t) => ({
    id: newReviewTaskId(),
    subject: t.subject?.trim() || "Other",
    task: t.task?.trim() || "",
    notes: t.notes?.trim() || undefined,
    selected: Boolean(t.task?.trim()),
  }));
}

export function reviewableToHomework(rows: ReviewableTask[]): HomeworkTask[] {
  return rows
    .filter((r) => r.selected && r.task.trim())
    .map((r) => ({
      subject: r.subject.trim() || "Other",
      task: r.task.trim(),
      notes: r.notes?.trim() || undefined,
    }));
}

export function emptyManualTask(): ReviewableTask {
  return {
    id: newReviewTaskId(),
    subject: "Maths",
    task: "",
    notes: "",
    selected: true,
  };
}
