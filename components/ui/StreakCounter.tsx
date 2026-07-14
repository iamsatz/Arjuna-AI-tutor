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
      <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-arjuna-primaryLight px-2.5 py-1.5">
        <span className="text-base leading-none">🔥</span>
        <span className="text-sm font-bold text-arjuna-primaryDark">{count}</span>
        <span className="text-xs text-arjuna-muted">streak</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="mb-1 flex justify-between text-xs text-arjuna-muted">
          <span>Today&apos;s goal</span>
          <span className="font-semibold text-arjuna-text">
            {todayCompleted}/{todayTarget}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-arjuna-border">
          <div
            className="h-full rounded-full bg-arjuna-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
