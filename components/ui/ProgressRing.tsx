type ProgressRingProps = {
  value: number;
  max: number;
  size?: number;
};

export function ProgressRing({ value, max, size = 56 }: ProgressRingProps) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#FFE4C4"
        strokeWidth={6}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#4F46E5"
        strokeWidth={6}
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}
