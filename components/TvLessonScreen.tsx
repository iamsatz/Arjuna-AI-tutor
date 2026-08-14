"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TvLessonView } from "./TvLessonView";
import { loadChildProfile, type ChildProfile } from "@/lib/childProfile";
import { loadSettings } from "@/lib/settings";
import {
  useSupabaseRoomSubscriber,
  createSupabaseRoomClient,
} from "@/hooks/useSupabaseRoom";
import { useLessonSession } from "@/hooks/useLessonSession";
import { createInitialLessonState, type LessonState } from "@/lib/lessonTypes";
import { getInitialTvCode } from "@/lib/platform";

/**
 * Drives the TV's own screen from room-synced state. The TV always speaks —
 * see the phone-companion-mode note in BACKLOG.md for the follow-up needed
 * so the phone stops also speaking for actions it triggers in phone_tv mode.
 */
function TvLessonRoom({
  profile,
  roomState,
}: {
  profile: ChildProfile;
  roomState: LessonState;
}) {
  const lesson = useLessonSession({
    profile,
    controller: "tv",
    externalState: roomState,
  });

  return (
    <TvLessonView
      state={lesson.state}
      loading={lesson.loading}
      onRepeat={() =>
        void lesson.speak(lesson.state.currentExplanation || lesson.state.lastReply)
      }
      onExplainAgain={() => void lesson.handleExplainAgain()}
      onUnderstood={() => void lesson.handleUnderstood()}
      onNotUnderstood={() => void lesson.handleNotUnderstood()}
    />
  );
}

function DigitButton({
  digit,
  onPick,
}: {
  digit: string;
  onPick: (d: string) => void;
}) {
  return (
    <button
      type="button"
      data-focusable="true"
      onClick={() => onPick(digit)}
      className="tv-focus flex h-20 min-w-[72px] items-center justify-center rounded-2xl border-2 border-arjuna-primary/25 bg-white text-3xl font-bold text-arjuna-text"
    >
      {digit}
    </button>
  );
}

export function TvLessonScreen() {
  const profile = loadChildProfile();
  const settings = loadSettings();
  const initialCode = getInitialTvCode();
  const [entry, setEntry] = useState(initialCode ?? "");
  const [activeCode, setActiveCode] = useState<string | null>(
    settings.deviceMode === "tv_only" ? null : initialCode,
  );
  const { state, connected } = useSupabaseRoomSubscriber(activeCode);
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  const pickDigit = useCallback((d: string) => {
    setEntry((p) => (p.length >= 4 ? p : p + d));
  }, []);

  const joinRoom = useCallback(() => {
    if (entry.length === 4) setActiveCode(entry);
  }, [entry]);

  useEffect(() => {
    firstFocusRef.current?.focus();
  }, [activeCode]);

  useEffect(() => {
    if (settings.deviceMode !== "tv_only" || !profile || activeCode) return;

    void (async () => {
      const initial = createInitialLessonState(profile.childName, {
        grade: profile.grade,
        inviteCode: profile.inviteCode,
        languageMode: settings.languageMode,
        deviceMode: "tv_only",
        controller: "tv",
      });
      const code = await createSupabaseRoomClient(initial);
      if (code) setActiveCode(code);
    })();
  }, [activeCode, profile, settings.deviceMode, settings.languageMode]);

  if (settings.deviceMode === "tv_only") {
    if (!profile) {
      return (
        <main className="flex min-h-dvh items-center justify-center bg-arjuna-bg p-10">
          <p className="text-2xl text-arjuna-text">
            Open invite link on phone first to set child name.
          </p>
        </main>
      );
    }

    if (!activeCode || !state) {
      return (
        <main className="flex min-h-dvh items-center justify-center bg-arjuna-bg">
          <p className="text-xl text-arjuna-muted">Starting TV session…</p>
        </main>
      );
    }

    return <TvLessonRoom profile={profile} roomState={state} />;
  }

  if (!activeCode || !connected || !state || !profile) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-5xl flex-col items-center justify-center gap-8 bg-arjuna-bg px-10 py-12">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.35em] text-arjuna-muted">
            Arjuna · TV
          </p>
          <h1 className="mt-3 text-4xl font-bold text-arjuna-text">
            Enter code from phone
          </h1>
        </div>
        <div className="rounded-3xl bg-white px-10 py-6 shadow-lg">
          <p className="text-center font-mono text-6xl font-bold tracking-[0.45em] text-arjuna-primary">
            {entry.padEnd(4, "·")}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <DigitButton key={d} digit={d} onPick={pickDigit} />
          ))}
          <button
            type="button"
            data-focusable="true"
            onClick={() => setEntry("")}
            className="tv-focus flex h-20 items-center justify-center rounded-2xl border-2 bg-white text-lg"
          >
            Clear
          </button>
          <DigitButton digit="0" onPick={pickDigit} />
          <button
            ref={firstFocusRef}
            type="button"
            data-focusable="true"
            onClick={() => setEntry((p) => p.slice(0, -1))}
            className="tv-focus flex h-20 items-center justify-center rounded-2xl border-2 bg-white text-lg"
          >
            ⌫
          </button>
        </div>
        <button
          type="button"
          data-focusable="true"
          disabled={entry.length !== 4}
          onClick={joinRoom}
          className="tv-focus rounded-2xl bg-arjuna-primary px-10 py-4 text-xl font-semibold text-white disabled:opacity-40"
        >
          Connect TV
        </button>
        <Link href="/roadmap" className="text-arjuna-muted underline">
          Roadmap & backlog
        </Link>
      </main>
    );
  }

  return <TvLessonRoom profile={profile} roomState={state} />;
}
