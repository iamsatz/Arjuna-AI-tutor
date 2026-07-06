import { getRewardStats, getStreak } from "@/lib/streak";

export type Badge = {
  id: string;
  label: string;
  emoji: string;
  earned: boolean;
};

export function getBadges(): Badge[] {
  const { count, todayCompleted, todayActivities } = getStreak();
  const stats = getRewardStats();

  const tripleCrown =
    todayActivities.includes("homework") &&
    todayActivities.includes("english") &&
    todayActivities.includes("words");

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
    {
      id: "word_collector",
      label: "Word collector",
      emoji: "📚",
      earned: stats.wordsDays >= 7,
    },
    {
      id: "story_teller",
      label: "Story teller",
      emoji: "✍️",
      earned: stats.journalEntries >= 5,
    },
    {
      id: "grammar_hero",
      label: "Grammar hero",
      emoji: "🦸",
      earned: stats.englishSessions >= 10,
    },
    {
      id: "triple_crown",
      label: "Triple crown",
      emoji: "👑",
      earned: tripleCrown,
    },
  ];
}
