import type { TaskHistoryEntry } from "@/lib/taskHistoryStore";

async function hashFile(file: File): Promise<string> {
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
