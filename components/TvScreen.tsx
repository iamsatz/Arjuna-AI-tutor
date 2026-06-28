"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArjunaAvatar } from "./ArjunaAvatar";
import { useRoomSubscriber } from "@/hooks/useRoomSync";
import { getInitialTvCode } from "@/lib/platform";

function DigitButton({
  digit,
  onPick,
}: {
  digit: string;
  onPick: (digit: string) => void;
}) {
  return (
    <button
      type="button"
      data-focusable="true"
      onClick={() => onPick(digit)}
      className="tv-focus flex h-20 min-w-[72px] items-center justify-center rounded-2xl border-2 border-arjuna-primary/25 bg-white text-3xl font-bold text-arjuna-text shadow-sm"
    >
      {digit}
    </button>
  );
}

export function TvScreen() {
  const initialCode = getInitialTvCode();
  const [entry, setEntry] = useState(initialCode ?? "");
  const [activeCode, setActiveCode] = useState<string | null>(initialCode);
  const { state, connected } = useRoomSubscriber(activeCode);
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  const pickDigit = useCallback((digit: string) => {
    setEntry((prev) => (prev.length >= 4 ? prev : prev + digit));
  }, []);

  const clearEntry = useCallback(() => setEntry(""), []);
  const backspace = useCallback(() => setEntry((prev) => prev.slice(0, -1)), []);

  const joinRoom = useCallback(() => {
    if (entry.length === 4) setActiveCode(entry);
  }, [entry]);

  useEffect(() => {
    firstFocusRef.current?.focus();
  }, [activeCode]);

  if (!activeCode || !connected || !state) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-5xl flex-col items-center justify-center gap-8 bg-arjuna-bg px-10 py-12">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.35em] text-arjuna-muted">
            Arjuna · TV
          </p>
          <h1 className="mt-3 text-4xl font-bold text-arjuna-text">
            Enter code from phone
          </h1>
          <p className="mt-2 text-lg text-arjuna-muted">
            Phone controls talk & photo. TV shows Arjuna big.
          </p>
        </div>

        <div className="rounded-3xl bg-white px-10 py-6 shadow-lg">
          <p className="text-center font-mono text-6xl font-bold tracking-[0.45em] text-arjuna-primary">
            {entry.padEnd(4, "·")}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <DigitButton key={digit} digit={digit} onPick={pickDigit} />
          ))}
          <button
            type="button"
            data-focusable="true"
            onClick={clearEntry}
            className="tv-focus flex h-20 items-center justify-center rounded-2xl border-2 border-arjuna-primary/25 bg-white text-lg font-semibold text-arjuna-muted"
          >
            Clear
          </button>
          <DigitButton digit="0" onPick={pickDigit} />
          <button
            ref={firstFocusRef}
            type="button"
            data-focusable="true"
            onClick={backspace}
            className="tv-focus flex h-20 items-center justify-center rounded-2xl border-2 border-arjuna-primary/25 bg-white text-lg font-semibold text-arjuna-muted"
          >
            ⌫
          </button>
        </div>

        <button
          type="button"
          data-focusable="true"
          disabled={entry.length !== 4}
          onClick={joinRoom}
          className="tv-focus rounded-2xl bg-arjuna-primary px-10 py-4 text-xl font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Connect TV
        </button>

        {activeCode && !connected && (
          <p className="text-base text-red-700">
            Code {activeCode} not found. Check phone is on same Wi‑Fi.
          </p>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col items-center justify-center gap-10 bg-arjuna-bg px-12 py-10">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-[0.35em] text-arjuna-muted">
          Arjuna · TV
        </p>
        <p className="mt-2 text-lg text-arjuna-muted">
          Linked to phone · code {activeCode}
        </p>
      </div>

      <ArjunaAvatar state={state.avatarState} size="tv" />

      <p className="max-w-3xl text-center text-2xl font-medium text-arjuna-text">
        {state.statusMessage}
      </p>

      {state.lastReply && (
        <div className="max-w-4xl rounded-3xl bg-white/90 px-8 py-6 shadow-md">
          <p className="text-sm font-semibold uppercase tracking-widest text-arjuna-muted">
            Arjuna said
          </p>
          <p className="mt-3 text-xl leading-relaxed text-arjuna-text">
            {state.lastReply}
          </p>
        </div>
      )}

      <p className="text-base text-arjuna-muted">
        Use phone for Talk, Photo, and Done.
      </p>
    </main>
  );
}
