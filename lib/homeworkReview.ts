import type { HomeworkTask } from "@/lib/types";
import type { TaskHistoryEntry } from "@/lib/taskHistoryStore";
import { findHistoryByTask, taskHistoryKey } from "@/lib/taskHistoryStore";

export type DuplicateInfo = {
  completedAt: string;
  notes?: string;
  outcomeNote?: string;
};

export type ReviewableTask = {
  id: string;
  subject: string;
  task: string;
  notes?: string;
  selected: boolean;
  subjectUncertain?: boolean;
  subjectConfirmed?: boolean;
  duplicateOf?: DuplicateInfo;
};

export function newReviewTaskId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function inferSubjectUncertain(task: HomeworkTask): boolean {
  if (task.subjectUncertain) return true;
  const subject = task.subject?.trim() || "";
  if (!subject || subject === "Other") return true;
  return false;
}

function duplicateFromEntry(entry: TaskHistoryEntry): DuplicateInfo {
  return {
    completedAt: entry.completedAt,
    notes: entry.notes,
    outcomeNote: entry.outcomeNote,
  };
}

export function homeworkToReviewable(
  tasks: HomeworkTask[],
  history: TaskHistoryEntry[] = [],
  imageMatchEntry?: TaskHistoryEntry,
): ReviewableTask[] {
  return tasks.map((t) => {
    const subject = t.subject?.trim() || "Other";
    const taskText = t.task?.trim() || "";
    const historyMatch = taskText
      ? findHistoryByTask(history, subject, taskText)
      : undefined;
    const dupEntry = historyMatch ?? imageMatchEntry;
    const uncertain = inferSubjectUncertain(t);

    return {
      id: newReviewTaskId(),
      subject,
      task: taskText,
      notes: t.notes?.trim() || undefined,
      selected: Boolean(taskText) && !dupEntry,
      subjectUncertain: uncertain,
      subjectConfirmed: !uncertain,
      duplicateOf: dupEntry ? duplicateFromEntry(dupEntry) : undefined,
    };
  });
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
    subjectUncertain: false,
    subjectConfirmed: true,
  };
}

export type MergeReviewResult = {
  tasks: ReviewableTask[];
  skippedDuplicates: { task: string; entry: TaskHistoryEntry }[];
};

/** Append incoming tasks; surface duplicates instead of silent skip. */
export function mergeReviewTasks(
  existing: ReviewableTask[],
  incoming: ReviewableTask[],
  history: TaskHistoryEntry[] = [],
): MergeReviewResult {
  const seen = new Set(existing.map((t) => taskHistoryKey(t.subject, t.task)));
  const merged = [...existing];
  const skippedDuplicates: MergeReviewResult["skippedDuplicates"] = [];

  for (const row of incoming) {
    if (!row.task.trim()) continue;
    const key = taskHistoryKey(row.subject, row.task);
    if (seen.has(key)) {
      const entry = findHistoryByTask(history, row.subject, row.task);
      if (entry) {
        skippedDuplicates.push({ task: row.task, entry });
      }
      continue;
    }
    seen.add(key);
    merged.push(row);
  }

  return { tasks: merged, skippedDuplicates };
}

export function tasksToReviewable(tasks: HomeworkTask[]): ReviewableTask[] {
  return homeworkToReviewable(tasks);
}

export function allSubjectsConfirmed(tasks: ReviewableTask[]): boolean {
  return tasks
    .filter((t) => t.selected && t.task.trim())
    .every((t) => !t.subjectUncertain || t.subjectConfirmed);
}

export function markSubjectConfirmed(
  tasks: ReviewableTask[],
  id: string,
  subject: string,
): ReviewableTask[] {
  return tasks.map((t) =>
    t.id === id
      ? { ...t, subject, subjectUncertain: false, subjectConfirmed: true }
      : t,
  );
}

export function dismissDuplicate(
  tasks: ReviewableTask[],
  id: string,
): ReviewableTask[] {
  return tasks.map((t) =>
    t.id === id ? { ...t, duplicateOf: undefined, selected: true } : t,
  );
}

export function skipDuplicate(
  tasks: ReviewableTask[],
  id: string,
): ReviewableTask[] {
  return tasks.map((t) =>
    t.id === id ? { ...t, selected: false } : t,
  );
}
