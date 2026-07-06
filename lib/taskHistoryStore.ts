const MAX_ENTRIES = 50;

export type TaskHistoryEntry = {
  id: string;
  subject: string;
  task: string;
  notes?: string;
  outcomeNote?: string;
  completedAt: string;
  imageHashes?: string[];
};

function storageKey(profileId: string): string {
  return `arjuna-task-history-${profileId}`;
}

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `h_${Date.now()}`;
}

export function profileHistoryKey(profile: {
  id?: string;
  inviteCode: string;
  childName: string;
}): string {
  return profile.id ?? `${profile.inviteCode}:${profile.childName}`;
}

export function loadTaskHistory(profileId: string): TaskHistoryEntry[] {
  if (typeof window === "undefined" || !profileId) return [];
  try {
    const raw = localStorage.getItem(storageKey(profileId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TaskHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTaskHistory(profileId: string, entries: TaskHistoryEntry[]) {
  if (typeof window === "undefined" || !profileId) return;
  localStorage.setItem(
    storageKey(profileId),
    JSON.stringify(entries.slice(0, MAX_ENTRIES)),
  );
}

export function appendTaskHistory(
  profileId: string,
  entry: Omit<TaskHistoryEntry, "id" | "completedAt"> & {
    id?: string;
    completedAt?: string;
  },
): TaskHistoryEntry {
  const full: TaskHistoryEntry = {
    id: entry.id ?? newId(),
    completedAt: entry.completedAt ?? new Date().toISOString(),
    subject: entry.subject,
    task: entry.task,
    notes: entry.notes,
    outcomeNote: entry.outcomeNote,
    imageHashes: entry.imageHashes,
  };
  const existing = loadTaskHistory(profileId);
  saveTaskHistory(profileId, [full, ...existing]);
  return full;
}

export function taskHistoryKey(subject: string, task: string): string {
  return `${subject.trim().toLowerCase()}|${task.trim().toLowerCase()}`;
}

export function findHistoryByTask(
  history: TaskHistoryEntry[],
  subject: string,
  task: string,
): TaskHistoryEntry | undefined {
  const key = taskHistoryKey(subject, task);
  return history.find((h) => taskHistoryKey(h.subject, h.task) === key);
}

export function findHistoryByImageHash(
  history: TaskHistoryEntry[],
  hash: string,
): TaskHistoryEntry | undefined {
  return history.find((h) => h.imageHashes?.includes(hash));
}
