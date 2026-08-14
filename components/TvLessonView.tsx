"use client";

import { useEffect, useRef } from "react";
import { ArjunaAvatar } from "@/components/ArjunaAvatar";
import { ProgressRing } from "@/components/ui/ProgressRing";
import type { LessonState } from "@/lib/lessonTypes";

type TvLessonViewProps = {
  state: LessonState;
  loading?: boolean;
  /** Replay the current line verbatim — no AI call. */
  onRepeat: () => void;
  /** Ask for a different explanation of the same task. */
  onExplainAgain: () => void;
  onUnderstood: () => void;
  onNotUnderstood: () => void;
};

/**
 * The TV's own screen — not the phone UI mirrored onto a bigger display.
 * Large text and four remote-focusable buttons for a lean-back distance;
 * every upload/typing action stays on the phone.
 */
export function TvLessonView({
  state,
  loading = false,
  onRepeat,
  onExplainAgain,
  onUnderstood,
  onNotUnderstood,
}: TvLessonViewProps) {
  const firstFocusRef = useRef<HTMLButtonElement>(null);
  const task = state.tasks[state.currentTaskIndex];
  const spokenLine = state.currentExplanation || state.lastReply;
  const isDone = state.phase === "session_done";
  const isWaitingForParent = state.phase === "parent_needed";

  // Re-focus the primary action whenever the phase changes, so the D-pad
  // always lands somewhere useful without the viewer having to hunt for it —
  // the same pattern TvLessonScreen already uses for the pairing keypad.
  useEffect(() => {
    firstFocusRef.current?.focus();
  }, [state.phase, state.currentTaskIndex]);

  return (
    <main className="flex h-dvh flex-col items-center justify-between overflow-hidden bg-arjuna-bg px-12 py-6 text-arjuna-text">
      <header className="flex w-full items-center justify-between">
        <span className="rounded-full bg-white/80 px-4 py-1.5 font-display text-base font-semibold uppercase tracking-[0.3em] text-arjuna-primaryDark shadow-chunky">
          Arjuna · TV
        </span>
        {state.tasks.length > 0 && !isDone && (
          <div className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 shadow-chunky">
            <ProgressRing
              value={state.currentTaskIndex + 1}
              max={state.tasks.length}
              size={32}
            />
            <span className="font-display text-base font-semibold">
              Task {state.currentTaskIndex + 1} of {state.tasks.length}
            </span>
          </div>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 text-center">
        <ArjunaAvatar state={loading ? "loading" : state.avatarState} size="tv" />

        {isDone ? (
          <div className="max-w-3xl space-y-2">
            <p className="font-display text-4xl font-bold">All done for today!</p>
            <p className="text-xl text-arjuna-muted">
              Great work, {state.childName}. See you next time.
            </p>
          </div>
        ) : isWaitingForParent ? (
          <div className="max-w-3xl space-y-2 rounded-3xl border-2 border-amber-200 bg-amber-50 px-8 py-5 shadow-chunky">
            <p className="text-3xl">🤝</p>
            <p className="font-display text-3xl font-bold text-amber-900">
              Let&apos;s ask Amma or Nanna
            </p>
            <p className="text-xl text-amber-900">
              This one is tricky. Work it out together on the phone.
            </p>
          </div>
        ) : (
          <div className="max-w-3xl space-y-2">
            {task && (
              <p className="font-display text-xl font-semibold uppercase tracking-wide text-arjuna-primaryDark">
                {task.subject} — {task.task}
              </p>
            )}
            <p className="font-display text-3xl font-bold leading-snug">
              {spokenLine || "Getting your homework ready…"}
            </p>
          </div>
        )}
      </div>

      {!isDone && !isWaitingForParent && (
        <div className="grid w-full max-w-3xl grid-cols-2 gap-3">
          <button
            ref={firstFocusRef}
            type="button"
            data-focusable="true"
            disabled={loading}
            onClick={onRepeat}
            className="tv-focus btn-chunky bg-white px-6 py-3 text-xl text-arjuna-text disabled:opacity-40"
          >
            🔁 Repeat
          </button>
          <button
            type="button"
            data-focusable="true"
            disabled={loading}
            onClick={onExplainAgain}
            className="tv-focus btn-chunky bg-white px-6 py-3 text-xl text-arjuna-text disabled:opacity-40"
          >
            💡 Explain differently
          </button>
          <button
            type="button"
            data-focusable="true"
            disabled={loading}
            onClick={onUnderstood}
            className="tv-focus btn-chunky bg-arjuna-green px-6 py-3 text-xl text-white disabled:opacity-40"
          >
            ✅ I understood
          </button>
          <button
            type="button"
            data-focusable="true"
            disabled={loading}
            onClick={onNotUnderstood}
            className="tv-focus btn-chunky bg-arjuna-primary px-6 py-3 text-xl text-white disabled:opacity-40"
          >
            🤔 Didn&apos;t understand
          </button>
        </div>
      )}
    </main>
  );
}
