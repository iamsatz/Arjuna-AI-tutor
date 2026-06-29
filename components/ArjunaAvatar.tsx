"use client";

import Image from "next/image";
import type { AvatarState } from "@/lib/avatar";

type ArjunaAvatarProps = {
  state: AvatarState;
  onTap?: () => void;
  size?: "phone" | "tv" | "sm";
  showTarget?: boolean;
};

const MASCOT_SRC = "/mascot/arjuna.png";

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
            ? "Reading…"
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
        aria-label="Arjuna — your homework guru"
        disabled={isTv || !onTap}
        className={`relative overflow-hidden rounded-full bg-gradient-to-b from-amber-100 to-orange-200 shadow-chunky transition active:scale-95 ${ringClass}`}
        style={{ width: dim, height: dim }}
      >
        <Image
          src={MASCOT_SRC}
          alt="Arjuna"
          width={dim}
          height={dim}
          className="h-full w-full object-cover object-top"
          priority={isSm}
        />
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
