"use client";

import type { AvatarState } from "@/lib/avatar";

type ArjunaAvatarProps = {
  state: AvatarState;
  onTap?: () => void;
  size?: "phone" | "tv" | "sm";
  showTarget?: boolean;
};

export function ArjunaAvatar({
  state,
  onTap,
  size = "phone",
  showTarget = false,
}: ArjunaAvatarProps) {
  const isTv = size === "tv";
  const isSm = size === "sm";
  const dim = isTv ? 288 : isSm ? 96 : 160;

  const ringClass =
    state === "speaking"
      ? "ring-4 ring-arjuna-primary/50 animate-pulse"
      : state === "listening"
        ? "ring-4 ring-arjuna-green/50 animate-pulse"
        : state === "celebrate"
          ? "ring-4 ring-arjuna-yellow animate-bounceSoft"
          : state === "loading"
            ? "ring-4 ring-arjuna-muted/30 animate-pulse"
            : "ring-2 ring-arjuna-primary/20";

  const statusLabel =
    state === "speaking"
      ? "Talking…"
      : state === "listening"
        ? "Listening…"
        : state === "celebrate"
          ? "Bullseye!"
          : state === "loading"
            ? "Getting ready…"
            : null;

  return (
    <div className="relative flex flex-col items-center">
      {showTarget && state === "celebrate" && (
        <div className="pointer-events-none absolute -right-2 top-4 animate-arrow-hit text-3xl">
          🎯
        </div>
      )}
      <button
        type="button"
        onClick={onTap}
        aria-label="Arjuna mascot"
        disabled={isTv || !onTap}
        className={`relative overflow-hidden rounded-full bg-gradient-to-b from-amber-200 to-orange-400 shadow-chunky transition active:scale-95 ${ringClass}`}
        style={{ width: dim, height: dim }}
      >
        <svg
          viewBox="0 0 120 120"
          className="h-full w-full"
          aria-hidden
        >
          <circle cx="60" cy="60" r="58" fill="#FFD9A8" />
          <ellipse cx="60" cy="72" rx="28" ry="32" fill="#FDBA74" />
          <circle cx="60" cy="42" r="26" fill="#FED7AA" />
          <circle cx="52" cy="40" r="3" fill="#2D2419" />
          <circle cx="68" cy="40" r="3" fill="#2D2419" />
          <path
            d="M52 50 Q60 56 68 50"
            fill="none"
            stroke="#2D2419"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M38 58 Q60 38 82 58"
            fill="none"
            stroke="#8B4513"
            strokeWidth="3"
          />
          <rect x="78" y="48" width="28" height="6" rx="3" fill="#8B4513" />
          <path d="M106 51 L112 51 L110 46 Z" fill="#64748B" />
          <ellipse cx="48" cy="46" rx="4" ry="2" fill="#FCA5A5" opacity="0.6" />
          <ellipse cx="72" cy="46" rx="4" ry="2" fill="#FCA5A5" opacity="0.6" />
        </svg>
      </button>
      {statusLabel && (
        <span
          className={`absolute -bottom-3 rounded-full px-3 py-1 text-xs font-display font-semibold text-white ${
            state === "celebrate"
              ? "bg-arjuna-yellow text-arjuna-text"
              : state === "listening"
                ? "bg-arjuna-green"
                : "bg-arjuna-primary"
          }`}
        >
          {statusLabel}
        </span>
      )}
    </div>
  );
}
