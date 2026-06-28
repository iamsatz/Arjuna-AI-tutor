"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ArjunaAvatar } from "./ArjunaAvatar";
import { PairingBadge } from "./PairingBadge";
import type { ChildProfile } from "@/lib/childProfile";
import { useLessonSession } from "@/hooks/useLessonSession";
import { loadSettings } from "@/lib/settings";
import type { StoredExam } from "@/lib/examTypes";

type LessonScreenProps = {
  profile: ChildProfile;
  controller?: "phone" | "tv";
  externalState?: ReturnType<typeof useLessonSession>["state"] | null;
  readOnly?: boolean;
  onStateChange?: (state: ReturnType<typeof useLessonSession>["state"]) => void;
};

export function LessonScreen({
  profile,
  controller = "phone",
  externalState,
  readOnly,
  onStateChange,
}: LessonScreenProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [textInput, setTextInput] = useState("");
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<StoredExam[]>([]);

  useEffect(() => {
    async function loadExams() {
      try {
        const res = await fetch(
          `/api/exam?inviteCode=${encodeURIComponent(profile.inviteCode)}`,
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
  }, [profile.inviteCode]);

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
      alert("Mic permission needed");
    }
  }

  const showInput = state.phase === "input" && !readOnly;
  const showTeaching =
    state.phase === "teaching" ||
    state.phase === "task_intro" ||
    state.phase === "doubt";
  const showParent = state.phase === "parent_needed" || state.phase === "parent_solution";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-arjuna-bg px-6 py-8">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium uppercase tracking-widest text-arjuna-muted">
          Arjuna · {profile.childName}
        </p>
        <div className="flex gap-3">
          <Link href="/exam" className="text-sm text-arjuna-primaryDark underline">
            Exams
          </Link>
          <Link href="/settings" className="text-sm text-arjuna-primaryDark underline">
            Settings
          </Link>
        </div>
      </div>

      {state.code && (
        <PairingBadge code={state.code} tvLinked={settings.deviceMode === "phone_tv"} />
      )}

      <div className="flex flex-col items-center gap-4 py-4">
        <ArjunaAvatar state={state.avatarState} />
        <p className="max-w-xs text-center text-base text-arjuna-text">
          {state.statusMessage}
        </p>
        {state.lastReply && state.phase !== "input" && (
          <div className="w-full rounded-xl bg-white/90 p-4 text-sm text-arjuna-text">
            {state.lastReply}
          </div>
        )}
      </div>

      {showInput && (
        <div className="space-y-3">
          {upcomingExams.length > 0 && (
            <div className="rounded-xl bg-white/95 p-4 shadow-sm">
              <p className="text-sm font-semibold text-arjuna-text">Upcoming exams</p>
              <ul className="mt-2 space-y-2 text-sm text-arjuna-muted">
                {upcomingExams.map((exam) => (
                  <li key={exam.id}>
                    {exam.subject}
                    {exam.exam_date
                      ? ` · ${new Date(exam.exam_date).toLocaleDateString()}`
                      : ""}
                  </li>
                ))}
              </ul>
              <Link
                href="/exam"
                className="mt-3 block rounded-xl bg-green-600 py-2 text-center text-sm font-semibold text-white"
              >
                Prepare for exam
              </Link>
            </div>
          )}
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
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            className="w-full rounded-xl bg-arjuna-primary py-3 font-semibold text-white"
          >
            📷 Photo homework
          </button>
          <button
            type="button"
            onClick={() => void startMic()}
            disabled={loading}
            className="w-full rounded-xl border border-arjuna-primary/30 bg-white py-3 font-semibold text-arjuna-text"
          >
            {recording ? "⏹ Stop & send" : "🎤 Speak homework"}
          </button>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type homework here…"
            className="w-full rounded-xl border border-arjuna-primary/20 p-3 text-sm"
            rows={3}
          />
          <button
            type="button"
            disabled={loading || !textInput.trim()}
            onClick={() => void lesson.extractTasks({ type: "text", text: textInput })}
            className="w-full rounded-xl border border-arjuna-primary/30 bg-white py-3 font-semibold text-arjuna-text disabled:opacity-50"
          >
            ⌨️ Send typed homework
          </button>
        </div>
      )}

      {showTeaching && !readOnly && (
        <div className="mt-auto space-y-3 pb-4">
          {state.tasks[state.currentTaskIndex] && (
            <p className="rounded-lg bg-arjuna-primary/10 px-3 py-2 text-sm">
              {state.tasks[state.currentTaskIndex].subject}:{" "}
              {state.tasks[state.currentTaskIndex].task}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void lesson.handleUnderstood()}
              className="flex-1 rounded-xl bg-green-600 py-3 font-semibold text-white"
            >
              ✅ Understood
            </button>
            <button
              type="button"
              onClick={() => void lesson.handleNotUnderstood()}
              className="flex-1 rounded-xl bg-arjuna-primary py-3 font-semibold text-white"
            >
              🔄 Explain again
            </button>
          </div>
          <textarea
            value={doubtInput}
            onChange={(e) => setDoubtInput(e.target.value)}
            placeholder="Type your doubt…"
            className="w-full rounded-xl border p-3 text-sm"
            rows={2}
          />
          <button
            type="button"
            disabled={!doubtInput.trim()}
            onClick={() => void lesson.handleDoubt()}
            className="w-full rounded-xl border border-arjuna-primary/30 bg-white py-3 font-semibold disabled:opacity-50"
          >
            ❓ Doubt
          </button>
        </div>
      )}

      {showParent && (
        <div className="mt-auto space-y-3 pb-4">
          {state.phase === "parent_solution" && state.parentSolution ? (
            <div className="rounded-xl bg-yellow-50 p-4 text-sm text-arjuna-text">
              <p className="font-semibold">Parent solution</p>
              <p className="mt-2 whitespace-pre-wrap">{state.parentSolution}</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-arjuna-muted">Parent: enter PIN to see full solution</p>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="PIN"
                className="w-full rounded-xl border p-3"
              />
              <button
                type="button"
                onClick={() => void lesson.unlockParentSolution()}
                className="w-full rounded-xl bg-arjuna-primary py-3 font-semibold text-white"
              >
                Unlock answer
              </button>
            </>
          )}
        </div>
      )}

      <div className="mt-4 text-center">
        <Link href="/roadmap" className="text-xs text-arjuna-muted underline">
          Coming soon features
        </Link>
      </div>
    </main>
  );
}
