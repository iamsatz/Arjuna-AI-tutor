export type DailyWord = {
  word: string;
  meaning: string;
  meaningTelugu?: string;
  ipa?: string;
  example: string;
  source?: string;
};

export type DailyWordsPack = {
  date: string;
  words: DailyWord[];
  known: string[];
};

function storageKey(profileId: string): string {
  return `arjuna-daily-words-${profileId}`;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function loadDailyWords(profileId: string): DailyWordsPack | null {
  if (typeof window === "undefined" || !profileId) return null;
  try {
    const raw = localStorage.getItem(storageKey(profileId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DailyWordsPack;
    if (parsed.date !== todayKey()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDailyWords(profileId: string, pack: DailyWordsPack): void {
  if (typeof window === "undefined" || !profileId) return;
  localStorage.setItem(storageKey(profileId), JSON.stringify(pack));
}

export function markWordKnown(profileId: string, word: string): DailyWordsPack | null {
  const pack = loadDailyWords(profileId);
  if (!pack) return null;
  const w = word.trim().toLowerCase();
  if (!pack.known.map((k) => k.toLowerCase()).includes(w)) {
    pack.known.push(word);
  }
  saveDailyWords(profileId, pack);
  return pack;
}

export function isDailyWordsComplete(pack: DailyWordsPack | null): boolean {
  if (!pack || !pack.words.length) return false;
  return pack.known.length >= pack.words.length;
}

export function collectHomeworkText(
  history: { subject: string; task: string; notes?: string }[],
): string {
  return history
    .filter((h) => h.subject.trim().toLowerCase() === "english")
    .slice(0, 8)
    .map((h) => `${h.task} ${h.notes ?? ""}`)
    .join("\n");
}
