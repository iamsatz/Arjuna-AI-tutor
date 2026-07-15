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
import type { ChildProfile } from "@/lib/childProfile";
import { useLessonSession } from "@/hooks/useLessonSession";
import { loadSettings } from "@/lib/settings";
import { recordDailyActivity } from "@/lib/streak";
import { GeminiStatusPill } from "@/components/GeminiStatusPill";
import type { StoredExam } from "@/lib/examTypes";
import { AppTabNav } from "@/components/AppTabNav";
import { TodayRing } from "@/components/TodayRing";
import { HomeworkCaptureTray } from "./HomeworkCaptureTray";
import { HomeworkInputBar, MAX_PHOTOS } from "./HomeworkInputBar";
import { HomeworkTaskReview } from "./HomeworkTaskReview";
import { LessonProgress } from "@/components/ui/LessonProgress";
import {
  buildExtractionHint,
  emptyManualTask,
  homeworkToReviewable,
  mergeReviewTasks,
  reviewableToHomework,
  tasksToReviewable,
  usualSubjectsFromHistory,
  dismissDuplicate,
  skipDuplicate,
  type ReviewableTask,
} from "@/lib/homeworkReview";
import { prepareUploadFiles } from "@/lib/compressImage";
import { hashFiles, formatCompletedAt } from "@/lib/duplicateTasks";
import {
  findHistoryByImageHash,
  loadTaskHistory,
  profileHistoryKey,
} from "@/lib/taskHistoryStore";
import { friendlyPdfExtractError } from "@/lib/userErrors";
import type { AvatarState } from "@/lib/avatar";

type HwPhase = "capture" | "extracting" | "review";

type LessonScreenProps = {
  profile: ChildProfile;
  controller?: "phone" | "tv";
  externalState?: ReturnType<typeof useLessonSession>["state"] | null;
  readOnly?: boolean;
  onActiveChange?: (id: string) => void;
};

export function LessonScreen({
  profile,
  controller = "phone",
  externalState,
  readOnly,
  onActiveChange,
}: LessonScreenProps) {
  const searchParams = useSearchParams();
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const addPageRef = useRef<HTMLInputElement>(null);
  const [hwPhase, setHwPhase] = useState<HwPhase>("capture");
  const [reviewTasks, setReviewTasks] = useState<ReviewableTask[]>([]);
  const [reviewEditMode, setReviewEditMode] = useState(false);
  const [extractHint, setExtractHint] = useState<string | null>(null);
  const [pageHashes, setPageHashes] = useState<string[]>([]);
  const [startingLesson, setStartingLesson] = useState(false);
  const [upcomingExams, setUpcomingExams] = useState<StoredExam[]>([]);
  const [ringKey, setRingKey] = useState(0);
  const [avatarOverride, setAvatarOverride] = useState<AvatarState | null>(null);
  const [showWelcome, setShowWelcome] = useState(
    () => searchParams.get("welcome") === "1",
  );
  const [kidSheetOpen, setKidSheetOpen] = useState(false);

  useEffect(() => {
    setRingKey((k) => k + 1);
  }, [profile.id]);

  useEffect(() => {
    async function loadExams() {
      try {
        const params = new URLSearchParams({ inviteCode: profile.inviteCode });
        if (profile.id) params.set("profileId", profile.id);
        else params.set("childName", profile.childName);
        const res = await fetch(`/api/exam?${params.toString()}`);
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
  }, [profile.inviteCode, profile.id, profile.childName]);

  const lesson = useLessonSession({
    profile,
    controller,
    externalState,
    readOnly,
  });

  const { state, loading, doubtInput, setDoubtInput, pinInput, setPinInput, speak } =
    lesson;
  const settings = loadSettings();

  const celebrateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (celebrateTimeoutRef.current) clearTimeout(celebrateTimeoutRef.current);
    };
  }, []);

  const onUnderstood = useCallback(async () => {
    await lesson.handleUnderstood();
    recordDailyActivity("homework");
    setRingKey((k) => k + 1);
    setAvatarOverride("celebrate");
    if (celebrateTimeoutRef.current) clearTimeout(celebrateTimeoutRef.current);
    celebrateTimeoutRef.current = setTimeout(() => {
      setAvatarOverride(null);
      celebrateTimeoutRef.current = null;
    }, 1200);
  }, [lesson]);

  function openManualReview(hint?: string) {
    setReviewTasks([emptyManualTask()]);
    setReviewEditMode(false);
    setExtractHint(hint ?? "Type each homework task below, then tap Start teaching.");
    setHwPhase("review");
  }

  const runRead = useCallback(
    async (input: {
      files?: File[];
      text?: string;
      merge?: boolean;
      pageHashes?: string[];
    }) => {
      setHwPhase("extracting");
      setExtractHint(null);

      const history = loadTaskHistory(profileHistoryKey(profile));
      const hashes = input.pageHashes ?? pageHashes;
      const imageEntry =
        hashes.length > 0
          ? findHistoryByImageHash(history, hashes[0])
          : undefined;

      const result = await lesson.extractHomeworkForReview({
        files: input.files,
        text: input.text,
      });

      const hadPdf = input.files?.some((f) => f.type === "application/pdf");

      if (input.merge) {
        const incoming =
          result.tasks.length > 0
            ? homeworkToReviewable(result.tasks, history, imageEntry)
            : [];
        setReviewTasks((prev) => {
          const base = prev.length ? prev : [emptyManualTask()];
          if (!incoming.length) return base;
          const merged = mergeReviewTasks(base, incoming, history);
          if (merged.skippedDuplicates.length > 0) {
            const when = formatCompletedAt(
              merged.skippedDuplicates[0].entry.completedAt,
            );
            setExtractHint(
              `${merged.skippedDuplicates.length} duplicate task(s) skipped — already done ${when}.`,
            );
          } else if (result.error) {
            setExtractHint(result.error);
          } else if (!incoming.length) {
            setExtractHint("No new tasks found on that page.");
          }
          return merged.tasks;
        });
        setHwPhase("review");
        return;
      }

      const rows =
        result.tasks.length > 0
          ? homeworkToReviewable(result.tasks, history, imageEntry)
          : [];

      if (rows.length === 0) {
        let hint =
          result.error ??
          "Couldn't read it clearly — type your homework below.";
        if (hadPdf) {
          hint = friendlyPdfExtractError();
        }
        openManualReview(hint);
        return;
      }

      setReviewTasks(rows);
      setExtractHint(
        result.error ??
          buildExtractionHint({
            foundTasks: result.tasks,
            confidence: result.confidence,
            usualSubjects: usualSubjectsFromHistory(history),
          }),
      );
      setReviewEditMode(false);
      setHwPhase("review");
    },
    [lesson, pageHashes, profile],
  );

  async function handleCapture(files: File[]) {
    const prepared = await prepareUploadFiles(files.slice(0, MAX_PHOTOS));
    const hashes = await hashFiles(prepared);
    setPageHashes(hashes);
    void runRead({ files: prepared, pageHashes: hashes });
  }

  function handleReadText(text: string) {
    void runRead({ text });
  }

  function handleAddPageFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    void (async () => {
      const prepared = await prepareUploadFiles(
        Array.from(fileList).slice(0, MAX_PHOTOS),
      );
      const hashes = await hashFiles(prepared);
      setPageHashes((prev) => [...prev, ...hashes]);
      void runRead({ files: prepared, merge: true, pageHashes: hashes });
    })();
  }

  function stopMicStream() {
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
  }

  async function toggleMic() {
    if (transcribing || recording) {
      if (!recording) return;
      const recorder = recorderRef.current;
      if (!recorder) return;
      setTranscribing(true);
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        recorder.stop();
      });
      setRecording(false);
      stopMicStream();
      recorderRef.current = null;
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      chunksRef.current = [];
      const text = await lesson.transcribeToText(blob);
      setTranscribing(false);
      if (text) {
        void runRead({ text });
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      stopMicStream();
      setExtractHint(
        "Microphone blocked. Allow mic in browser settings, or type your homework.",
      );
    }
  }

  function openEditTasks() {
    const fromTeaching =
      state.tasks.length > 0
        ? tasksToReviewable(state.tasks)
        : reviewTasks;
    setReviewTasks(fromTeaching);
    setReviewEditMode(true);
    setExtractHint(null);
    setHwPhase("review");
  }

  function closeReview() {
    setReviewEditMode(false);
    setExtractHint(null);
    setHwPhase("capture");
  }

  async function handleStartSelected() {
    const selected = reviewableToHomework(reviewTasks);
    if (!selected.length) return;
    setStartingLesson(true);
    await lesson.startSelectedTasks(selected, { pageHashes });
    setStartingLesson(false);
    setReviewEditMode(false);
    setHwPhase("capture");
  }

  const showInput = state.phase === "input" && !readOnly;
  const showReview = hwPhase === "review" && !readOnly;
  const showCaptureHome = showInput && hwPhase === "capture";
  const showGuided =
    !readOnly &&
    !showReview &&
    (state.phase === "ask_explain" ||
      state.phase === "ask_help_mode" ||
      state.phase === "try_self" ||
      state.phase === "capture_answer" ||
      state.phase === "verify_result");
  const showTeaching =
    !showReview &&
    !showGuided &&
    (state.phase === "teaching" || state.phase === "doubt");
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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-arjuna-bg px-5 pb-28 pt-5">
      {/* ── Header ── */}
      <header className="mb-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {/* Avatar chip — tapping opens KidSwitcher sheet when multiple profiles exist */}
          <button
            type="button"
            aria-label={`Switch student — currently ${profile.childName}`}
            onClick={() => {
              if (controller === "phone" && !readOnly) {
                setKidSheetOpen(true);
              }
            }}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-arjuna-primary font-display text-base font-bold text-white shadow-chunky transition active:scale-95"
          >
            {profile.childName.trim().charAt(0).toUpperCase() || "?"}
          </button>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-sm font-bold text-arjuna-text">
              {profile.childName}
            </span>
            <GeminiStatusPill />
          </div>
        </div>
        <Link
          href="/settings"
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm transition active:scale-95"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-arjuna-muted" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </Link>
      </header>

      {/* ── KidSwitcher — bottom sheet ── */}
      {kidSheetOpen && controller === "phone" && !readOnly && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setKidSheetOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md rounded-t-3xl bg-white px-5 pb-8 pt-5 shadow-chunky">
            <div className="mb-1 flex items-center justify-between">
              <p className="font-display text-base font-bold text-arjuna-text">
                Switch student
              </p>
              <button
                type="button"
                onClick={() => setKidSheetOpen(false)}
                aria-label="Close"
                className="rounded-full p-1 text-arjuna-muted hover:text-arjuna-text"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <KidSwitcher
              onActiveChange={(id) => {
                setKidSheetOpen(false);
                onActiveChange?.(id);
              }}
            />
          </div>
        </>
      )}

      {hwPhase === "extracting" && !readOnly && (
        <LessonProgress step="reading" />
      )}

      {showCaptureHome && (
        <div className="mb-4">
          <HomeworkInputBar
            disabled={loading || startingLesson}
            recording={recording}
            transcribing={transcribing}
            onCapture={handleCapture}
            onReadText={handleReadText}
            onToggleMic={() => void toggleMic()}
            onManualEntry={() => openManualReview()}
          />
        </div>
      )}

      {showReview && (
        <>
          <HomeworkTaskReview
            tasks={reviewTasks}
            extractHint={extractHint ?? undefined}
            editMode={reviewEditMode}
            onChange={setReviewTasks}
            onAddManual={() =>
              setReviewTasks((prev) => [...prev, emptyManualTask()])
            }
            onAddPage={() => addPageRef.current?.click()}
            onBack={closeReview}
            onStart={() => void handleStartSelected()}
            onDone={() => void handleStartSelected()}
            starting={startingLesson}
            onSpeakSubjectQuestion={(task, index) => {
              const snippet = task.task.trim().slice(0, 80);
              void speak(
                `Task ${index + 1}. ${snippet || "This homework"}. Which subject is this?`,
              );
            }}
            onSpeakDuplicate={(task, index) => {
              const when = task.duplicateOf
                ? formatCompletedAt(task.duplicateOf.completedAt)
                : "before";
              void speak(
                `Task ${index + 1}. You already worked on this ${when}.`,
              );
            }}
            onDismissDuplicate={(id) =>
              setReviewTasks((prev) => dismissDuplicate(prev, id))
            }
            onSkipDuplicate={(id) =>
              setReviewTasks((prev) => skipDuplicate(prev, id))
            }
          />
          <input
            ref={addPageRef}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              handleAddPageFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </>
      )}

      {showCaptureHome && (
        <>
          {/* Greeting hero card — indigo gradient */}
          <div className="mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-arjuna-primary to-arjuna-primaryDark px-5 py-5 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-display text-2xl font-bold leading-tight text-white">
                  {greeting},<br />{profile.childName}!
                </p>
                {profile.grade && (
                  <p className="mt-1 text-sm font-medium text-white/70">
                    {profile.grade}
                  </p>
                )}
                <p className="mt-3 rounded-2xl bg-white/15 px-3 py-2 text-sm font-medium text-white/90">
                  What homework do you have today?
                </p>
              </div>
              <ArjunaAvatar state={avatarState} size="sm" showTarget />
            </div>
            <div className="mt-4">
              <TodayRing refreshKey={ringKey} />
            </div>
          </div>

          {/* Welcome banner */}
          {showWelcome && (
            <Card className="mb-4 border-sky-200 bg-sky-50 py-3">
              <p className="font-display font-bold text-arjuna-text">
                You&apos;re all set, {profile.childName}!
              </p>
              <p className="mt-1 text-sm text-arjuna-muted">
                Type your homework below, or attach a photo to scan it.
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

          <InstallPrompt />
          <CurriculumNudge profile={profile} />

          {upcomingExams.length > 0 && (
            <Card className="mt-4 border-arjuna-primaryLight bg-arjuna-primaryLight">
              <p className="font-display font-bold text-arjuna-text">
                Upcoming exams
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
        </>
      )}

      {state.code && (
        <PairingBadge
          code={state.code}
          tvLinked={settings.deviceMode === "phone_tv"}
        />
      )}

      {(showGuided ||
        (!showInput && !showReview && hwPhase !== "extracting")) && (
        <div className="flex flex-col items-center gap-4 py-4">
          <ArjunaAvatar state={avatarState} showTarget />
          <p className="max-w-xs text-center text-base font-medium text-arjuna-text">
            {state.statusMessage}
          </p>
          {state.lastReply &&
            state.phase !== "input" &&
            state.phase !== "capture_answer" && (
            <Card className="w-full py-4">
              <p className="text-sm leading-relaxed text-arjuna-text">
                {state.lastReply}
              </p>
            </Card>
          )}
        </div>
      )}

      {showGuided && state.tasks[state.currentTaskIndex] && (
        <div className="mt-auto space-y-3 pb-4">
          <Card className="border-arjuna-border bg-arjuna-bg py-3">
            <p className="text-xs font-semibold uppercase text-arjuna-muted">
              Task {state.currentTaskIndex + 1} of {state.tasks.length}
            </p>
            <p className="mt-1 font-display font-bold text-arjuna-text">
              {state.tasks[state.currentTaskIndex].subject}:{" "}
              {state.tasks[state.currentTaskIndex].task}
            </p>
          </Card>

          {state.phase === "ask_explain" && (
            <div className="flex gap-2">
              <Button
                size="lg"
                className="flex-1"
                onClick={() => void lesson.handleExplainChoice(true)}
              >
                Yes, explain
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="flex-1"
                onClick={() => void lesson.handleExplainChoice(false)}
              >
                I&apos;ll try
              </Button>
            </div>
          )}

          {state.phase === "ask_help_mode" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void lesson.handleHelpMode("explain")}
                  className="flex-1 rounded-2xl border-2 border-arjuna-primary bg-arjuna-primary py-3 font-display text-sm font-bold text-white shadow-chunky-press transition active:scale-95"
                >
                  Explain it
                </button>
                <button
                  type="button"
                  onClick={() => void lesson.handleHelpMode("hint")}
                  className="flex-1 rounded-2xl border border-arjuna-border bg-white py-3 font-display text-sm font-bold text-arjuna-primaryDark transition active:scale-95"
                >
                  Give a hint
                </button>
                <button
                  type="button"
                  onClick={() => void lesson.handleHelpMode("try_self")}
                  className="flex-1 rounded-2xl border border-arjuna-border bg-white py-3 font-display text-sm font-bold text-arjuna-text transition active:scale-95"
                >
                  I&apos;ll try
                </button>
              </div>
              <textarea
                value={doubtInput}
                onChange={(e) => setDoubtInput(e.target.value)}
                placeholder="Or ask Arjuna anything..."
                className="w-full rounded-2xl border border-arjuna-border p-3 text-sm"
                rows={2}
              />
              <Button
                variant="secondary"
                className="w-full"
                disabled={!doubtInput.trim() || loading}
                onClick={() => {
                  void lesson.handleHelpModeText(doubtInput).then(() =>
                    setDoubtInput(""),
                  );
                }}
              >
                Ask Arjuna
              </Button>
            </div>
          )}

          {state.phase === "try_self" && (
            <div className="space-y-2">
              <Button
                size="lg"
                variant="success"
                className="w-full"
                onClick={() => void lesson.handleStartAnswerCapture()}
              >
                I finished — check my answer
              </Button>
              <textarea
                value={doubtInput}
                onChange={(e) => setDoubtInput(e.target.value)}
                placeholder="Ask a question…"
                className="w-full rounded-2xl border border-arjuna-border p-3 text-sm"
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

          {state.phase === "capture_answer" && (
            <HomeworkCaptureTray
              mode="answer"
              disabled={loading}
              onCapture={(files) => {
                if (files[0]) void lesson.handleVerifyAnswer(files[0]);
              }}
            />
          )}

          {state.phase === "verify_result" && (
            <Button
              size="lg"
              variant="success"
              className="w-full"
              onClick={() => void onUnderstood()}
            >
              {state.lastVerifyCorrect ? "Correct — next!" : "Continue"}
            </Button>
          )}
        </div>
      )}

      {showTeaching && !readOnly && (
        <div className="mt-auto space-y-3 pb-4">
          {state.tasks.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {state.tasks.map((t, i) => (
                <button
                  key={`${t.subject}-${i}`}
                  type="button"
                  onClick={() => void lesson.jumpToTask(i)}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    i === state.currentTaskIndex
                      ? "bg-arjuna-primary text-white"
                      : "bg-white text-arjuna-muted ring-1 ring-arjuna-border"
                  }`}
                >
                  {i + 1}. {t.subject}
                </button>
              ))}
            </div>
          )}
          {state.tasks[state.currentTaskIndex] && (
            <Card className="border-arjuna-border bg-arjuna-bg py-3">
              <p className="text-xs font-semibold uppercase text-arjuna-muted">
                Task {state.currentTaskIndex + 1} of {state.tasks.length}
              </p>
              <p className="mt-1 font-display font-bold text-arjuna-text">
                {state.tasks[state.currentTaskIndex].subject}:{" "}
                {state.tasks[state.currentTaskIndex].task}
              </p>
            </Card>
          )}
          <button
            type="button"
            onClick={openEditTasks}
            className="w-full text-center text-xs font-semibold text-arjuna-primaryDark underline"
          >
            Edit / add page
          </button>
          <div className="flex gap-2">
            <Button
              variant="success"
              size="lg"
              className="flex-1"
              onClick={() => void lesson.handleReadyToTry()}
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
          {state.teachFailed && (
            <Button
              size="lg"
              variant="secondary"
              className="w-full"
              disabled={loading}
              onClick={() => void lesson.handleRetryTeach()}
            >
              Retry
            </Button>
          )}
          <textarea
            value={doubtInput}
            onChange={(e) => setDoubtInput(e.target.value)}
            placeholder="Ask a question…"
            className="w-full rounded-2xl border border-arjuna-border p-3 text-sm"
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
                className="w-full rounded-2xl border border-arjuna-border p-3"
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

      {/* Fixed bottom tab bar — always visible */}
      <AppTabNav active="homework" />
    </main>
  );
}
