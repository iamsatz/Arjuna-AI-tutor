"use client";

import { useEffect, useState } from "react";
import { StreakCounter } from "@/components/ui/StreakCounter";
import { getStreak, type StreakData } from "@/lib/streak";

type TodayRingProps = {
  refreshKey?: string | number;
  className?: string;
};

const DEFAULT_STREAK: StreakData = {
  count: 0,
  todayCompleted: 0,
  todayTarget: 3,
  todayActivities: [],
};

export function TodayRing({ refreshKey, className = "" }: TodayRingProps) {
  // Start with the same SSR-safe defaults the server rendered — reading the
  // real localStorage value here would mismatch the server markup on
  // hydration and flash 0 -> real value. The real value loads in useEffect.
  const [streak, setStreak] = useState<StreakData>(DEFAULT_STREAK);

  useEffect(() => {
    setStreak(getStreak());
  }, [refreshKey]);

  return (
    <div className={className}>
      <StreakCounter
        count={streak.count}
        todayCompleted={streak.todayCompleted}
        todayTarget={streak.todayTarget}
      />
    </div>
  );
}
