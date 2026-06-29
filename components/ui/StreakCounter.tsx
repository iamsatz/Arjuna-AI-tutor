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
      <div className="flex items-center gap-1 rounded-2xl bg-orange-100 px-3 py-2">
        <span className="text-lg">🔥</span>
        <span className="font-display text-lg font-bold text-arjuna-primaryDark">
          {count}
        </span>
        <span className="text-xs text-arjuna-muted">day streak</span>
      </div>
      <div className="flex-1">
        <div className="mb-1 flex justify-between text-xs font-semibold text-arjuna-muted">
          <span>Today&apos;s target</span>
          <span>
            {todayCompleted}/{todayTarget}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-orange-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-arjuna-primary to-arjuna-yellow transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
