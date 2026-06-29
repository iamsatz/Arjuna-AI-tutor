type PairingBadgeProps = {
  code: string | null;
  tvLinked: boolean;
};

export function PairingBadge({ code, tvLinked }: PairingBadgeProps) {
  if (!code) return null;

  return (
    <div className="mb-4 flex w-full flex-col items-center gap-1 rounded-2xl border-2 border-purple-200 bg-purple-50 px-4 py-3 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
        Connect your TV
      </p>
      <p className="font-display text-3xl font-bold tracking-[0.25em] text-purple-900">
        {code}
      </p>
      <p className="text-xs text-purple-700">
        {tvLinked
          ? "TV connected — lesson shows on the big screen"
          : "On your TV, open Arjuna and type this code"}
      </p>
    </div>
  );
}
