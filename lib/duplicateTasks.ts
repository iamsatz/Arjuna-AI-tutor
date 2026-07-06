import type { HomeworkTask } from "@/lib/types";
import {
  findHistoryByImageHash,
  findHistoryByTask,
  type TaskHistoryEntry,
} from "@/lib/taskHistoryStore";

export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashFiles(files: File[]): Promise<string[]> {
  return Promise.all(files.map(hashFile));
}

export type DuplicateMatch = {
  subject: string;
  task: string;
  matchedEntry: TaskHistoryEntry;
  matchType: "task" | "image";
};

export function findDuplicateTasks(
  tasks: HomeworkTask[],
  history: TaskHistoryEntry[],
  pageHashes?: string[],
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];
  const seen = new Set<string>();

  for (const hash of pageHashes ?? []) {
    const entry = findHistoryByImageHash(history, hash);
    if (!entry) continue;
    const key = `img|${hash}`;
    if (seen.has(key)) continue;
    seen.add(key);
    matches.push({
      subject: entry.subject,
      task: entry.task,
      matchedEntry: entry,
      matchType: "image",
    });
  }

  for (const t of tasks) {
    if (!t.task.trim()) continue;
    const entry = findHistoryByTask(history, t.subject, t.task);
    if (!entry) continue;
    const key = `task|${t.subject}|${t.task}`;
    if (seen.has(key)) continue;
    seen.add(key);
    matches.push({
      subject: t.subject,
      task: t.task,
      matchedEntry: entry,
      matchType: "task",
    });
  }

  return matches;
}

export function formatCompletedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
