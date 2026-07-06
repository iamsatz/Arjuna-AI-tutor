"use client";

import { useEffect, useState } from "react";
import { StreakCounter } from "@/components/ui/StreakCounter";
import { BadgePill } from "@/components/ui/BadgePill";
import { getBadges } from "@/lib/badges";
import { getStreak, type StreakData } from "@/lib/streak";

type TodayRingProps = {
  refreshKey?: string | number;
  className?: string;
};

export function TodayRing({ refreshKey, className = "" }: TodayRingProps) {
  const [streak, setStreak] = useState<StreakData>(() => getStreak());
  const [badges, setBadges] = useState(getBadges);

  useEffect(() => {
    setStreak(getStreak());
    setBadges(getBadges());
  }, [refreshKey]);

  return (
    <div className={className}>
      <StreakCounter
        count={streak.count}
        todayCompleted={streak.todayCompleted}
        todayTarget={streak.todayTarget}
      />
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {badges.map((b) => (
          <BadgePill
            key={b.id}
            emoji={b.emoji}
            label={b.label}
            earned={b.earned}
          />
        ))}
      </div>
    </div>
  );
}
