import { getStreak } from "@/lib/streak";

export type Badge = {
  id: string;
  label: string;
  emoji: string;
  earned: boolean;
};

export function getBadges(): Badge[] {
  const { count, todayCompleted } = getStreak();

  return [
    {
      id: "first",
      label: "First arrow",
      emoji: "🎯",
      earned: todayCompleted >= 1,
    },
    {
      id: "streak3",
      label: "3-day streak",
      emoji: "🔥",
      earned: count >= 3,
    },
    {
      id: "streak7",
      label: "Week warrior",
      emoji: "⭐",
      earned: count >= 7,
    },
    {
      id: "five",
      label: "5 targets",
      emoji: "🏹",
      earned: todayCompleted >= 5,
    },
  ];
}
