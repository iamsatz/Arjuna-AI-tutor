import type { CurriculumTopic, StoredCurriculum } from "@/lib/curriculumTypes";
import type { TaskHistoryEntry } from "@/lib/taskHistoryStore";

/**
 * Revision scheduler (local-first): computes what's due when the app opens,
 * instead of a server cron nobody would see — there is no push channel yet,
 * so "due" only matters at app-open time anyway.
 */

export type WeeklySubjectPlan = { subject: string; topics: CurriculumTopic[] };
export type WeeklyPlan = { weekIndex: number; subjects: WeeklySubjectPlan[] };
export type DueRevision = {
  subject: string;
  task: string;
  completedAt: string;
  daysAgo: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export const TOPICS_PER_WEEK = 2;
export const REVISION_MIN_DAYS = 20;
export const REVISION_MAX_DAYS = 35;

export function weekIndexSince(startISO: string, now = new Date()): number {
  const start = new Date(startISO).getTime();
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, Math.floor((now.getTime() - start) / WEEK_MS));
}

/**
 * This week's slice of the term plan: TOPICS_PER_WEEK topics per subject,
 * advancing every week since the curriculum was uploaded and wrapping around
 * at the end of the topic list so the plan keeps cycling all term.
 */
export function weeklyPlan(
  curriculum: StoredCurriculum,
  now = new Date(),
): WeeklyPlan {
  const weekIndex = weekIndexSince(curriculum.created_at, now);
  const subjects = curriculum.subjects
    .map((s) => {
      if (!s.topics.length) return { subject: s.subject, topics: [] };
      const start = (weekIndex * TOPICS_PER_WEEK) % s.topics.length;
      const count = Math.min(TOPICS_PER_WEEK, s.topics.length);
      const topics: CurriculumTopic[] = [];
      for (let i = 0; i < count; i++) {
        topics.push(s.topics[(start + i) % s.topics.length]);
      }
      return { subject: s.subject, topics };
    })
    .filter((s) => s.topics.length > 0);

  return { weekIndex, subjects };
}

/** Tasks completed 20-35 days ago — due for spaced revision. */
export function dueRevisions(
  history: TaskHistoryEntry[],
  now = new Date(),
  limit = 6,
): DueRevision[] {
  const nowMs = now.getTime();
  const seen = new Set<string>();
  const due: DueRevision[] = [];

  for (const entry of history) {
    if (!entry.task?.trim()) continue;
    const completed = new Date(entry.completedAt).getTime();
    if (!Number.isFinite(completed)) continue;
    const daysAgo = Math.floor((nowMs - completed) / DAY_MS);
    if (daysAgo < REVISION_MIN_DAYS || daysAgo > REVISION_MAX_DAYS) continue;
    const key = `${entry.subject.trim().toLowerCase()}|${entry.task.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    due.push({
      subject: entry.subject,
      task: entry.task,
      completedAt: entry.completedAt,
      daysAgo,
    });
    if (due.length >= limit) break;
  }

  return due;
}

// --- weekly-test completion tracking (localStorage, per profile) ---

type WeeklyDoneRecord = { week: number; subjects: string[] };

function weeklyDoneKey(profileId: string): string {
  return `arjuna-weekly-test-${profileId}`;
}

export function weeklyTestDoneSubjects(
  profileId: string,
  weekIndex: number,
): string[] {
  if (typeof window === "undefined" || !profileId) return [];
  try {
    const raw = localStorage.getItem(weeklyDoneKey(profileId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WeeklyDoneRecord;
    if (parsed.week !== weekIndex || !Array.isArray(parsed.subjects)) return [];
    return parsed.subjects;
  } catch {
    return [];
  }
}

export function markWeeklyTestDone(
  profileId: string,
  weekIndex: number,
  subject: string,
): void {
  if (typeof window === "undefined" || !profileId) return;
  const existing = weeklyTestDoneSubjects(profileId, weekIndex);
  const next: WeeklyDoneRecord = {
    week: weekIndex,
    subjects: existing.includes(subject) ? existing : [...existing, subject],
  };
  localStorage.setItem(weeklyDoneKey(profileId), JSON.stringify(next));
}
