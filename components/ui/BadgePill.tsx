type BadgePillProps = {
  emoji: string;
  label: string;
  earned?: boolean;
};

export function BadgePill({ emoji, label, earned = false }: BadgePillProps) {
  return (
    <div
      className={`flex shrink-0 flex-col items-center gap-1 rounded-2xl px-3 py-2 ${
        earned
          ? "bg-amber-100 ring-2 ring-amber-300"
          : "bg-gray-100 opacity-50 grayscale"
      }`}
      title={label}
    >
      <span className="text-xl">{emoji}</span>
      <span className="max-w-[4.5rem] truncate text-[10px] font-semibold text-arjuna-text">
        {label}
      </span>
    </div>
  );
}
