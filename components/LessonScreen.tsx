"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArjunaAvatar } from "./ArjunaAvatar";
import { PairingBadge } from "./PairingBadge";
import { KidSwitcher } from "./KidSwitcher";
import { InstallPrompt } from "./InstallPrompt";
import { CurriculumNudge } from "./CurriculumNudge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StreakCounter } from "@/components/ui/StreakCounter";
import { BadgePill } from "@/components/ui/BadgePill";
import type { ChildProfile } from "@/lib/childProfile";
import { useLessonSession } from "@/hooks/useLessonSession";
import { loadSettings } from "@/lib/settings";
import type { StoredExam } from "@/lib/examTypes";
import { getStreak, recordConceptMastered } from "@/lib/streak";
import { getBadges } from "@/lib/badges";
import type { AvatarState } from "@/lib/avatar";

type LessonScreenProps = {
  profile: ChildProfile;
  controller?: "phone" | "tv";
  externalState?: ReturnType<typeof useLessonSession>["state"] | null;
  readOnly?: boolean;
  onStateChange?: (state: ReturnType<typeof useLessonSession>["state"]) => void;
  onActiveChange?: (id: string) => void;
};

export function LessonScreen({
  profile,
  controller = "phone",
  externalState,
  readOnly,
  onStateChange,
  onActiveChange,
}: LessonScreenProps) {
  const searchParams = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const [textInput, setTextInput] = useState("");
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<StoredExam[]>([]);
  const [streak, setStreak] = useState(getStreak);
  const [badges, setBadges] = useState(getBadges);
  const [avatarOverride, setAvatarOverride] = useState<AvatarState | null>(null);
  const [showWelcome, setShowWelcome] = useState(
    () => searchParams.get("welcome") === "1",
  );

  useEffect(() => {
    setStreak(getStreak());
    setBadges(getBadges());
  }, [profile.id]);

  useEffect(() => {
    async function loadExams() {
      try {
        const res = await fetch(
          `/api/exam?inviteCode=${encodeURIComponent(profile.inviteCode)}&childName=${encodeURIComponent(profile.childName)}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { exams: StoredExam[] };
        setUpcomingExams(
          (data.exams ?? []).filter((e) => e.status === "ready").slice(0, 3),
        );
      } catch {
        // ignore
      }
    }
    void loadExams();
  }, [profile.inviteCode, profile.childName]);

  const lesson = useLessonSession({
    profile,
    controller,
    externalState,
    onStateChange,
    readOnly,
  });

  const { state, loading, doubtInput, setDoubtInput, pinInput, setPinInput } =
    lesson;
  const settings = loadSettings();

  const onUnderstood = useCallback(async () => {
    await lesson.handleUnderstood();
    const next = recordConceptMastered();
    setStreak(next);
    setBadges(getBadges());
    setAvatarOverride("celebrate");
    setTimeout(() => setAvatarOverride(null), 1200);
  }, [lesson]);

  async function startMic() {
    if (recording) {
      const recorder = recorderRef.current;
      if (!recorder) return;
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        recorder.stop();
      });
      setRecording(false);
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      chunksRef.current = [];
      await lesson.transcribeAndExtract(blob);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      alert("Please allow microphone access in your browser settings.");
    }
  }

  const showInput = state.phase === "input" && !readOnly;
  const showTeaching =
    state.phase === "teaching" ||
    state.phase === "task_intro" ||
    state.phase === "doubt";
  const showParent =
    state.phase === "parent_needed" || state.phase === "parent_solution";
  const showSessionDone = state.phase === "session_done" && !readOnly;
  const lastTask = state.tasks[state.tasks.length - 1];

  const avatarState: AvatarState =
    avatarOverride ??
    (loading ? "loading" : recording ? "listening" : state.avatarState);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-arjuna-bg px-5 py-6">
      <header className="mb-4 flex items-center justify-between">
        <p className="font-display text-lg font-bold text-arjuna-text">
          Arjuna
        </p>
        <Link
          href="/settings"
          className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-arjuna-primaryDark shadow-sm"
        >
          Settings
        </Link>
      </header>

      {controller === "phone" && !readOnly && (
        <KidSwitcher onActiveChange={onActiveChange} />
      )}

      {showWelcome && showInput && (
        <Card className="mb-4 border-sky-200 bg-sky-50 py-3">
          <p className="font-display font-bold text-arjuna-text">
            You&apos;re all set, {profile.childName}!
          </p>
          <p className="mt-1 text-sm text-arjuna-muted">
            Pick Homework below, or install the app for the best experience.
          </p>
          <button
            type="button"
            onClick={() => setShowWelcome(false)}
            className="mt-2 text-xs text-arjuna-muted underline"
          >
            Got it
          </button>
        </Card>
      )}

      {showInput && <InstallPrompt />}
      {showInput && <CurriculumNudge profile={profile} />}

      {showInput && (
        <>
          <Card className="mb-4">
            <div className="flex items-start gap-4">
              <ArjunaAvatar state={avatarState} size="sm" showTarget />
              <div className="flex-1">
                <p className="font-display text-xl font-bold text-arjuna-text">
                  {greeting}, {profile.childName}!
                </p>
                {profile.grade && (
                  <p className="text-sm text-arjuna-muted">{profile.grade}</p>
                )}
              </div>
            </div>
            <div className="mt-4">
              <StreakCounter
                count={streak.count}
                todayCompleted={streak.todayCompleted}
                todayTarget={streak.todayTarget}
              />
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {badges.map((b) => (
                <BadgePill
                  key={b.id}
                  emoji={b.emoji}
                  label={b.label}
                  earned={b.earned}
                />
              ))}
            </div>
          </Card>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-3xl border-2 border-orange-300 bg-gradient-to-br from-orange-400 to-amber-500 p-4 text-center shadow-chunky">
              <span className="text-3xl">📚</span>
              <p className="mt-2 font-display font-bold text-white">Homework</p>
              <p className="mt-1 text-xs text-orange-100">You&apos;re here</p>
            </div>
            <Link
              href="/exam"
              className="rounded-3xl border-2 border-purple-200 bg-white p-4 text-center shadow-chunky transition active:scale-95"
            >
              <span className="text-3xl">🎯</span>
              <p className="mt-2 font-display font-bold text-arjuna-text">
                Exam Prep
              </p>
              <p className="mt-1 text-xs text-arjuna-muted">Learn &amp; revise</p>
            </Link>
          </div>
        </>
      )}

      {state.code && (
        <PairingBadge
          code={state.code}
          tvLinked={settings.deviceMode === "phone_tv"}
        />
      )}

      {!showInput && (
        <div className="flex flex-col items-center gap-4 py-4">
          <ArjunaAvatar state={avatarState} showTarget />
          <p className="max-w-xs text-center text-base font-medium text-arjuna-text">
            {state.statusMessage}
          </p>
          {state.lastReply && state.phase !== "input" && (
            <Card className="w-full py-4">
              <p className="text-sm leading-relaxed text-arjuna-text">
                {state.lastReply}
              </p>
            </Card>
          )}
        </div>
      )}

      {showInput && (
        <div className="space-y-3">
          {upcomingExams.length > 0 && (
            <Card className="border-green-200 bg-green-50">
              <p className="font-display font-bold text-arjuna-text">
                Coming up
              </p>
              <ul className="mt-2 space-y-1 text-sm text-arjuna-muted">
                {upcomingExams.map((exam) => (
                  <li key={exam.id}>
                    {exam.subject}
                    {exam.exam_date
                      ? ` · ${new Date(exam.exam_date).toLocaleDateString()}`
                      : ""}
                  </li>
                ))}
              </ul>
              <Link href="/exam" className="mt-3 block">
                <Button variant="success" className="w-full">
                  Open Exam Prep
                </Button>
              </Link>
            </Card>
          )}

          <p className="font-display text-sm font-bold text-arjuna-text">
            How do you want to add homework?
          </p>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void lesson.extractTasks({ type: "photo", file });
              e.target.value = "";
            }}
          />
          <Button
            size="lg"
            className="flex w-full items-center justify-center gap-2"
            disabled={loading}
            onClick={() => fileRef.current?.click()}
          >
            <span className="text-xl">📷</span> Photo homework
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="flex w-full items-center justify-center gap-2"
            disabled={loading}
            onClick={() => void startMic()}
          >
            <span className="text-xl">🎤</span>
            {recording ? "Stop & send" : "Speak homework"}
          </Button>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Or type homework here…"
            className="w-full rounded-2xl border-2 border-orange-100 p-4 text-sm"
            rows={3}
          />
          <Button
            variant="secondary"
            className="flex w-full items-center justify-center gap-2"
            disabled={loading || !textInput.trim()}
            onClick={() =>
              void lesson.extractTasks({ type: "text", text: textInput })
            }
          >
            <span className="text-xl">⌨️</span> Send typed homework
          </Button>
        </div>
      )}

      {showTeaching && !readOnly && (
        <div className="mt-auto space-y-3 pb-4">
          {state.tasks[state.currentTaskIndex] && (
            <Card className="border-orange-200 bg-orange-50 py-3">
              <p className="text-xs font-semibold uppercase text-arjuna-muted">
                Now learning
              </p>
              <p className="mt-1 font-display font-bold text-arjuna-text">
                {state.tasks[state.currentTaskIndex].subject}:{" "}
                {state.tasks[state.currentTaskIndex].task}
              </p>
            </Card>
          )}
          <div className="flex gap-2">
            <Button
              variant="success"
              size="lg"
              className="flex-1"
              onClick={() => void onUnderstood()}
            >
              Got it!
            </Button>
            <Button
              size="lg"
              className="flex-1"
              onClick={() => void lesson.handleNotUnderstood()}
            >
              Explain again
            </Button>
          </div>
          <textarea
            value={doubtInput}
            onChange={(e) => setDoubtInput(e.target.value)}
            placeholder="Ask a question…"
            className="w-full rounded-2xl border-2 border-orange-100 p-3 text-sm"
            rows={2}
          />
          <Button
            variant="secondary"
            className="w-full"
            disabled={!doubtInput.trim()}
            onClick={() => void lesson.handleDoubt()}
          >
            Ask Arjuna
          </Button>
        </div>
      )}

      {showSessionDone && lastTask && (
        <div className="mt-auto space-y-3 pb-4">
          <Card className="border-green-300 bg-green-50 text-center">
            <p className="text-4xl">🎯</p>
            <p className="mt-2 font-display text-lg font-bold text-green-900">
              Homework done!
            </p>
            <p className="mt-1 text-sm text-green-800">
              Want to practice this topic more?
            </p>
          </Card>
          <Link
            href={`/exam?subject=${encodeURIComponent(lastTask.subject)}&topic=${encodeURIComponent(lastTask.task)}`}
            className="block"
          >
            <Button variant="success" size="lg" className="w-full">
              Strengthen this topic
            </Button>
          </Link>
          <Link href="/exam" className="block">
            <Button variant="secondary" className="w-full">
              Open Exam Prep
            </Button>
          </Link>
        </div>
      )}

      {showParent && (
        <div className="mt-auto space-y-3 pb-4">
          {state.phase === "parent_solution" && state.parentSolution ? (
            <Card className="border-yellow-300 bg-yellow-50">
              <p className="font-display font-bold">Parent answer</p>
              <p className="mt-2 whitespace-pre-wrap text-sm">
                {state.parentSolution}
              </p>
            </Card>
          ) : (
            <>
              <p className="text-sm text-arjuna-muted">
                Parent: enter PIN to see the full answer
              </p>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="PIN"
                className="w-full rounded-2xl border-2 border-orange-100 p-3"
              />
              <Button
                className="w-full"
                onClick={() => void lesson.unlockParentSolution()}
              >
                Show answer
              </Button>
            </>
          )}
        </div>
      )}
    </main>
  );
}
