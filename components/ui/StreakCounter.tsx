type StreakCounterProps = {
  count: number;
  todayCompleted: number;
  todayTarget: number;
};

export function StreakCounter({
  count,
  todayCompleted,
  todayTarget,
}: StreakCounterProps) {
  const pct = Math.min(100, Math.round((todayCompleted / todayTarget) * 100));

  return (
    <div className="flex items-center gap-3">
      {/* Streak pill — white/25 bg so it reads on any dark gradient */}
      <div className="flex items-center gap-1 rounded-2xl bg-white/25 px-3 py-1.5">
        <span className="text-base leading-none">🔥</span>
        <span className="font-display text-base font-bold text-white">
          {count}
        </span>
        <span className="text-xs font-medium text-white">day streak</span>
      </div>
      <div className="flex-1">
        <div className="mb-1 flex justify-between text-xs font-semibold text-white">
          <span>Today&apos;s target</span>
          <span>
            {todayCompleted}/{todayTarget}
          </span>
        </div>
        {/* Progress bar — white/30 track, white fill */}
        <div className="h-2 overflow-hidden rounded-full bg-white/30">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
