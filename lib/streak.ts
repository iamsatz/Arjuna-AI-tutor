const STREAK_KEY = "arjuna-streak";
const LAST_DAY_KEY = "arjuna-streak-day";
const TODAY_TARGET_KEY = "arjuna-today-target";

export type StreakData = {
  count: number;
  todayCompleted: number;
  todayTarget: number;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getStreak(): StreakData {
  if (typeof window === "undefined") {
    return { count: 0, todayCompleted: 0, todayTarget: 3 };
  }

  const day = todayKey();
  const lastDay = localStorage.getItem(LAST_DAY_KEY);
  let count = Number(localStorage.getItem(STREAK_KEY) ?? "0");

  if (lastDay && lastDay !== day) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);
    if (lastDay !== yesterdayKey) count = 0;
    localStorage.setItem(STREAK_KEY, String(count));
    localStorage.setItem("arjuna-today-completed", "0");
  }

  const todayCompleted = Number(
    localStorage.getItem("arjuna-today-completed") ?? "0",
  );
  const todayTarget = Number(
    localStorage.getItem(TODAY_TARGET_KEY) ?? "3",
  );

  return { count, todayCompleted, todayTarget };
}

export function recordConceptMastered(): StreakData {
  const day = todayKey();
  const lastDay = localStorage.getItem(LAST_DAY_KEY);
  let count = Number(localStorage.getItem(STREAK_KEY) ?? "0");
  let todayCompleted = Number(
    localStorage.getItem("arjuna-today-completed") ?? "0",
  );

  if (lastDay !== day) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);
    if (lastDay !== yesterdayKey) count = 0;
    todayCompleted = 0;
  }

  todayCompleted += 1;
  if (todayCompleted === 1 && lastDay !== day) {
    count += 1;
  }

  localStorage.setItem(STREAK_KEY, String(count));
  localStorage.setItem(LAST_DAY_KEY, day);
  localStorage.setItem("arjuna-today-completed", String(todayCompleted));

  return getStreak();
}
