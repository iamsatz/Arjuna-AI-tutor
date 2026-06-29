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

function taskKey(subject: string, task: string): string {
  return `${subject.trim().toLowerCase()}|${task.trim().toLowerCase()}`;
}

/** Append incoming tasks, skipping duplicates by subject + task text. */
export function mergeReviewTasks(
  existing: ReviewableTask[],
  incoming: ReviewableTask[],
): ReviewableTask[] {
  const seen = new Set(existing.map((t) => taskKey(t.subject, t.task)));
  const merged = [...existing];
  for (const row of incoming) {
    const key = taskKey(row.subject, row.task);
    if (!row.task.trim() || seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }
  return merged;
}

export function tasksToReviewable(tasks: HomeworkTask[]): ReviewableTask[] {
  return tasks.map((t) => ({
    id: newReviewTaskId(),
    subject: t.subject?.trim() || "Other",
    task: t.task?.trim() || "",
    notes: t.notes?.trim() || undefined,
    selected: true,
  }));
}
