type BadgePillProps = {
  emoji: string;
  label: string;
  earned?: boolean;
};

export function BadgePill({ emoji, label, earned = false }: BadgePillProps) {
  return (
    <div
      className={`flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-2.5 py-2 ${
        earned
          ? "bg-amber-50 ring-1 ring-amber-300"
          : "bg-arjuna-bg opacity-50 grayscale"
      }`}
      title={label}
    >
      <span className="text-base leading-none">{emoji}</span>
      <span className="max-w-[3.5rem] truncate text-[10px] font-medium text-arjuna-muted">
        {label}
      </span>
    </div>
  );
}
