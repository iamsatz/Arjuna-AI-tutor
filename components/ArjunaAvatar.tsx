"use client";

export type AvatarState = "idle" | "speaking" | "loading" | "listening";

type ArjunaAvatarProps = {
  state: AvatarState;
  onTap?: () => void;
  size?: "phone" | "tv";
};

export function ArjunaAvatar({
  state,
  onTap,
  size = "phone",
}: ArjunaAvatarProps) {
  const isTv = size === "tv";
  const ringClass =
    state === "speaking"
      ? "ring-4 ring-arjuna-primary/40 animate-pulse"
      : state === "listening"
        ? "ring-4 ring-green-400/50 animate-pulse"
        : state === "loading"
          ? "ring-4 ring-arjuna-muted/30 animate-pulse"
          : "ring-2 ring-arjuna-primary/20";

  const shellClass = isTv
    ? "relative flex h-72 w-72 items-center justify-center rounded-full bg-gradient-to-b from-[#FFD9A8] to-[#E8872A] shadow-2xl"
    : "relative flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-b from-[#FFD9A8] to-[#E8872A] shadow-lg transition-transform active:scale-95";

  const emojiClass = isTv ? "text-9xl" : "text-6xl";

  return (
    <button
      type="button"
      onClick={onTap}
      aria-label="Arjuna"
      disabled={isTv}
      className={`${shellClass} ${ringClass}`}
    >
      <span className={emojiClass} role="img" aria-hidden="true">
        🙏
      </span>
      {state === "speaking" && (
        <span className="absolute -bottom-2 rounded-full bg-arjuna-primary px-3 py-1 text-xs font-medium text-white">
          speaking…
        </span>
      )}
      {state === "listening" && (
        <span className="absolute -bottom-2 rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white">
          listening…
        </span>
      )}
      {state === "loading" && (
        <span className="absolute -bottom-2 rounded-full bg-arjuna-muted px-3 py-1 text-xs font-medium text-white">
          getting ready…
        </span>
      )}
    </button>
  );
}
