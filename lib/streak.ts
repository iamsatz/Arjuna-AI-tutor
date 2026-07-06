import { loadSettings } from "@/lib/settings";

const STREAK_KEY = "arjuna-streak";
const LAST_DAY_KEY = "arjuna-streak-day";
const TODAY_TARGET_KEY = "arjuna-today-target";
const TODAY_ACTIVITIES_KEY = "arjuna-today-activities";
const STATS_KEY = "arjuna-reward-stats";

export type DailyActivityType = "homework" | "english" | "words" | "journal";

export type StreakData = {
  count: number;
  todayCompleted: number;
  todayTarget: number;
  todayActivities: DailyActivityType[];
};

export type RewardStats = {
  englishSessions: number;
  wordsDays: number;
  journalEntries: number;
  lastWordsDay?: string;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function rollDayIfNeeded(): void {
  if (typeof window === "undefined") return;
  const day = todayKey();
  const lastDay = localStorage.getItem(LAST_DAY_KEY);
  if (lastDay && lastDay !== day) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);
    let count = Number(localStorage.getItem(STREAK_KEY) ?? "0");
    if (lastDay !== yesterdayKey) count = 0;
    localStorage.setItem(STREAK_KEY, String(count));
    localStorage.setItem(TODAY_ACTIVITIES_KEY, "[]");
  }
}

function loadTodayActivities(): DailyActivityType[] {
  rollDayIfNeeded();
  try {
    const raw = localStorage.getItem(TODAY_ACTIVITIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DailyActivityType[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTodayActivities(activities: DailyActivityType[]) {
  localStorage.setItem(TODAY_ACTIVITIES_KEY, JSON.stringify(activities));
}

export function getRewardStats(): RewardStats {
  if (typeof window === "undefined") {
    return { englishSessions: 0, wordsDays: 0, journalEntries: 0 };
  }
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { englishSessions: 0, wordsDays: 0, journalEntries: 0 };
    return JSON.parse(raw) as RewardStats;
  } catch {
    return { englishSessions: 0, wordsDays: 0, journalEntries: 0 };
  }
}

function saveRewardStats(stats: RewardStats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function bumpRewardStat(field: keyof RewardStats, dayKey?: string) {
  const stats = getRewardStats();
  if (field === "englishSessions") stats.englishSessions += 1;
  if (field === "journalEntries") stats.journalEntries += 1;
  if (field === "wordsDays" && dayKey && stats.lastWordsDay !== dayKey) {
    stats.wordsDays += 1;
    stats.lastWordsDay = dayKey;
  }
  saveRewardStats(stats);
}

export function getStreak(): StreakData {
  if (typeof window === "undefined") {
    return { count: 0, todayCompleted: 0, todayTarget: 3, todayActivities: [] };
  }

  rollDayIfNeeded();
  const count = Number(localStorage.getItem(STREAK_KEY) ?? "0");
  const activities = loadTodayActivities();
  const settings = loadSettings();
  const todayTarget = Number(
    localStorage.getItem(TODAY_TARGET_KEY) ??
      String(settings.dailyRewardTarget ?? 3),
  );

  return {
    count,
    todayCompleted: activities.length,
    todayTarget: Math.max(1, Math.min(5, todayTarget || 3)),
    todayActivities: activities,
  };
}

export function setDailyRewardTarget(target: number): void {
  const t = Math.max(1, Math.min(5, target));
  localStorage.setItem(TODAY_TARGET_KEY, String(t));
}

export function recordDailyActivity(type: DailyActivityType): StreakData {
  if (typeof window === "undefined") return getStreak();

  const day = todayKey();
  const lastDay = localStorage.getItem(LAST_DAY_KEY);
  let count = Number(localStorage.getItem(STREAK_KEY) ?? "0");
  let activities = loadTodayActivities();

  if (lastDay !== day) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);
    if (lastDay !== yesterdayKey) count = 0;
    activities = [];
  }

  if (!activities.includes(type)) {
    activities = [...activities, type];
    saveTodayActivities(activities);
    if (activities.length === 1 && lastDay !== day) {
      count += 1;
    }
    localStorage.setItem(STREAK_KEY, String(count));
    localStorage.setItem(LAST_DAY_KEY, day);

    if (type === "english") bumpRewardStat("englishSessions");
    if (type === "journal") bumpRewardStat("journalEntries");
    if (type === "words") bumpRewardStat("wordsDays", day);
  }

  return getStreak();
}

/** @deprecated Use recordDailyActivity('homework') */
export function recordConceptMastered(): StreakData {
  return recordDailyActivity("homework");
}
