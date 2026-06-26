type ActionButtonProps = {
  icon: string;
  label: string;
  disabled?: boolean;
  onClick?: () => void;
};

export function ActionButton({
  icon,
  label,
  disabled = false,
  onClick,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-[88px] min-w-[88px] flex-1 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-arjuna-primary/20 bg-arjuna-surface px-4 py-5 shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
    >
      <span className="text-3xl" aria-hidden="true">
        {icon}
      </span>
      <span className="text-base font-semibold text-arjuna-text">{label}</span>
    </button>
  );
}
