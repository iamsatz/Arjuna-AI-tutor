const MAX_ENTRIES = 14;

export type JournalEntry = {
  id: string;
  prompt: string;
  kidText: string;
  arjunaReply: string;
  createdAt: string;
};

const PROMPTS = [
  "What made you smile today?",
  "One thing you learned today?",
  "Tell Arjuna about the best thing you ate this week.",
  "Who helped you today and how?",
  "What was tricky today? You tried anyway!",
  "If you could go anywhere tomorrow, where?",
  "Describe your favourite place at school.",
  "What are you proud of this week?",
  "Tell Arjuna about a game you played with your friends.",
  "What did your family do together this weekend?",
];

function storageKey(profileId: string): string {
  return `arjuna-journal-${profileId}`;
}

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `j_${Date.now()}`;
}

export function journalPromptForDay(): string {
  const day = new Date().getDate();
  return PROMPTS[day % PROMPTS.length];
}

export function loadJournal(profileId: string): JournalEntry[] {
  if (typeof window === "undefined" || !profileId) return [];
  try {
    const raw = localStorage.getItem(storageKey(profileId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as JournalEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveJournal(profileId: string, entries: JournalEntry[]) {
  if (typeof window === "undefined" || !profileId) return;
  localStorage.setItem(
    storageKey(profileId),
    JSON.stringify(entries.slice(0, MAX_ENTRIES)),
  );
}

export function appendJournal(
  profileId: string,
  entry: Omit<JournalEntry, "id" | "createdAt">,
): JournalEntry {
  const full: JournalEntry = {
    ...entry,
    id: newId(),
    createdAt: new Date().toISOString(),
  };
  saveJournal(profileId, [full, ...loadJournal(profileId)]);
  return full;
}

export function hasJournalToday(profileId: string): boolean {
  const day = new Date().toISOString().slice(0, 10);
  return loadJournal(profileId).some((e) => e.createdAt.slice(0, 10) === day);
}
