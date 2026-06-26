type PairingBadgeProps = {
  code: string | null;
  tvLinked: boolean;
};

export function PairingBadge({ code, tvLinked }: PairingBadgeProps) {
  if (!code) return null;

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-1 rounded-2xl border border-arjuna-primary/20 bg-white/90 px-4 py-3 text-center shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-arjuna-muted">
        Link TV
      </p>
      <p className="font-mono text-3xl font-bold tracking-[0.3em] text-arjuna-primary">
        {code}
      </p>
      <p className="text-xs text-arjuna-muted">
        {tvLinked
          ? "TV connected — session mirrored"
          : "Open TV app → enter this code"}
      </p>
    </div>
  );
}
