export type CurriculumBoard = "CBSE" | "ICSE" | "IB" | "State";

export type ChildProfile = {
  inviteCode: string;
  childName: string;
  grade?: string;
  board?: CurriculumBoard;
};

const STORAGE_KEY = "arjuna-child-profile";

export function buildGreeting(childName: string): string {
  return `Hi ${childName}! What homework do you have? Please upload or tell me the homework.`;
}

export function loadChildProfile(): ChildProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChildProfile;
    if (!parsed.inviteCode || !parsed.childName?.trim()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveChildProfile(profile: ChildProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function clearChildProfile(): void {
  localStorage.removeItem(STORAGE_KEY);
}
