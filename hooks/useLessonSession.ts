"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildScopeKey,
  buildStudentKey,
  type ChildProfile,
} from "@/lib/childProfile";
import { buildGreeting, buildExplainAgainPrompt } from "@/lib/prompts";
import type { LessonState } from "@/lib/lessonTypes";
import { createInitialLessonState } from "@/lib/lessonTypes";
import { loadSettings, verifyParentPin, type DeviceMode, type LanguageMode } from "@/lib/settings";
import type { HomeworkTask } from "@/lib/types";
import { track, setAnalyticsContext } from "@/lib/analytics";
import { playSpeech } from "@/lib/clientSpeech";
import { stripSpeechMarkers } from "@/lib/bridgeSubject";
import {
  createSupabaseRoomClient,
  useSupabaseRoomPublisher,
} from "@/hooks/useSupabaseRoom";
import { isTvDevice } from "@/lib/platform";

const MAX_ATTEMPTS = 4;

type UseLessonSessionOptions = {
  profile: ChildProfile;
  controller: "phone" | "tv";
  externalState?: LessonState | null;
  onStateChange?: (state: LessonState) => void;
  readOnly?: boolean;
};

export function useLessonSession({
  profile,
  controller,
  externalState,
  onStateChange,
  readOnly = false,
}: UseLessonSessionOptions) {
  const settings = loadSettings();
  const [state, setState] = useState<LessonState>(() =>
    createInitialLessonState(profile.childName, {
      grade: profile.grade,
      inviteCode: profile.inviteCode,
      languageMode: settings.languageMode,
      deviceMode: settings.deviceMode,
      controller,
    }),
  );
  const [doubtInput, setDoubtInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [loading, setLoading] = useState(false);
  const sessionTrackedRef = useRef(false);

  const studentKey = profile.id
    ? buildStudentKey(profile.inviteCode, profile.id)
    : undefined;
  const scopeKey = buildScopeKey(profile);

  const recordStudentOutcome = useCallback(
    (
      result: "understood" | "struggled" | "doubt",
      task: { subject: string; task: string } | undefined,
      note?: string,
    ) => {
      if (!studentKey || !task) return;
      void fetch("/api/student/outcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentKey,
          inviteCode: profile.inviteCode,
          childName: profile.childName,
          schoolKey: scopeKey,
          subject: task.subject,
          topic: task.task,
          result,
          note,
        }),
      }).catch(() => {});
    },
    [studentKey, scopeKey, profile.inviteCode, profile.childName],
  );

  const activeState = externalState ?? state;
  const { pushState } = useSupabaseRoomPublisher(activeState.code);

    const patchState = useCallback(
    (patch: Partial<LessonState>) => {
      if (readOnly) return;
      setState((prev) => {
        const base = externalState ?? prev;
        const next = { ...base, ...patch, updatedAt: Date.now() };
        if (next.code && settings.deviceMode !== "phone_only") {
          void pushState(next);
        }
        return externalState ? prev : next;
      });
      if (externalState) {
        const next = { ...externalState, ...patch, updatedAt: Date.now() };
        if (next.code && settings.deviceMode !== "phone_only") {
          void pushState(next);
        }
      }
    },
    [externalState, pushState, readOnly, settings.deviceMode],
  );

  const speak = useCallback(
    async (text: string) => {
      const display = stripSpeechMarkers(text);
      patchState({ avatarState: "loading", lastReply: display });
      try {
        patchState({ avatarState: "speaking" });
        await playSpeech(text, {
          speaker: "shubh",
          languageMode: settings.languageMode,
        });
      } catch {
        // ignore playback errors
      } finally {
        patchState({ avatarState: "idle" });
      }
    },
    [patchState, settings.languageMode],
  );

  const teachCurrentTask = useCallback(
    async (contextNote?: string, taskIndex?: number, tasksList?: HomeworkTask[]) => {
      const list = tasksList ?? activeState.tasks;
      const idx = taskIndex ?? activeState.currentTaskIndex;
      const task = list[idx];
      if (!task) return;

      setLoading(true);
      patchState({ avatarState: "loading", phase: "teaching" });

      const noteLine = task.notes?.trim()
        ? `Child/parent note: ${task.notes.trim()}. `
        : "";
      const baseContext =
        contextNote ??
        `${noteLine}Teach this task: ${task.subject} — ${task.task}`;
      const chatContext = `${noteLine}Current task: ${task.subject} — ${task.task}`;

      const intro =
        settings.languageMode === "pure_telugu"
          ? `${task.subject} homework. ${task.task}. ప్రశ్నను అర్థం అయిందా?`
          : settings.languageMode === "english"
            ? `${task.subject} homework. ${task.task}. Do you understand the question?`
            : `${task.subject} homework. ${task.task}. Question ardam ayyinda?`;

      const messages = [
        ...activeState.messages,
        {
          role: "user" as const,
          content: baseContext,
        },
      ];

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages,
            contextNote: chatContext,
            childName: profile.childName,
            grade: profile.grade,
            board: profile.board,
            method: profile.method,
            medium: profile.medium ?? "english_medium",
            languageMode: settings.languageMode,
            studentKey,
            scopeKey,
            subject: task.subject,
            topic: task.task,
          }),
        });
        if (!response.ok) throw new Error("chat failed");
        const data = (await response.json()) as { reply: string };
        const reply = data.reply || intro;
        const displayReply = stripSpeechMarkers(reply);

        patchState({
          messages: [...messages, { role: "assistant", content: reply }],
          currentExplanation: displayReply,
          statusMessage: displayReply,
          lastReply: displayReply,
          phase: "teaching",
        });
        await speak(reply);
        void track("example_given", {
          attempt: activeState.attemptCount + 1,
          subject: task.subject,
        });
      } catch {
        patchState({ statusMessage: "Something went wrong. Try again." });
      } finally {
        setLoading(false);
      }
    },
    [
      activeState.attemptCount,
      activeState.currentTaskIndex,
      activeState.messages,
      activeState.tasks,
      patchState,
      profile.childName,
      profile.grade,
      profile.board,
      profile.method,
      profile.medium,
      settings.languageMode,
      speak,
      studentKey,
      scopeKey,
    ],
  );

  const startTaskAt = useCallback(
    async (index: number, tasks?: HomeworkTask[]) => {
      const list = tasks ?? activeState.tasks;
      const task = list[index];
      if (!task) return;
      void track("task_started", { subject: task.subject, task: task.task });
      patchState({
        currentTaskIndex: index,
        attemptCount: 0,
        phase: "task_intro",
        statusMessage: `Task ${index + 1} of ${list.length}: ${task.subject}`,
      });
      await teachCurrentTask(undefined, index, list);
    },
    [activeState.tasks, patchState, teachCurrentTask],
  );

  const startTask = useCallback(async () => {
    await startTaskAt(activeState.currentTaskIndex);
  }, [activeState.currentTaskIndex, startTaskAt]);

  const extractHomeworkForReview = useCallback(
    async (input: {
      files?: File[];
      diaryNote?: string;
      text?: string;
    }): Promise<{
      tasks: HomeworkTask[];
      confidence: string;
      reason?: string;
      error?: string;
    }> => {
      setLoading(true);
      patchState({ avatarState: "loading", statusMessage: "Reading homework…" });

      try {
        let result: {
          tasks: HomeworkTask[];
          confidence: string;
          reason?: string;
        };

        if (input.files?.length) {
          const form = new FormData();
          for (const file of input.files) {
            form.append("photo", file);
          }
          if (input.diaryNote?.trim()) {
            form.append("diaryNote", input.diaryNote.trim());
          }
          if (input.text?.trim()) {
            form.append("text", input.text.trim());
          }
          const res = await fetch("/api/extract-tasks", {
            method: "POST",
            body: form,
          });
          if (!res.ok) {
            const err = (await res.json()) as { message?: string };
            throw new Error(err.message ?? "extract failed");
          }
          result = await res.json();
        } else {
          const combined = [input.diaryNote, input.text]
            .filter(Boolean)
            .join("\n\n")
            .trim();
          if (!combined) {
            return {
              tasks: [],
              confidence: "low",
              error: "Add photos or type the diary note first.",
            };
          }
          const res = await fetch("/api/extract-tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: combined,
              diaryNote: input.diaryNote?.trim(),
            }),
          });
          if (!res.ok) {
            const err = (await res.json()) as { message?: string };
            throw new Error(err.message ?? "extract failed");
          }
          result = await res.json();
        }

        void track("homework_input", {
          inputType: input.files?.length ? "photo" : "text",
          tasksCount: result.tasks?.length ?? 0,
        });

        patchState({ avatarState: "idle" });

        return {
          tasks: result.tasks ?? [],
          confidence: result.confidence ?? "medium",
          reason: result.reason,
        };
      } catch (e) {
        patchState({ avatarState: "idle" });
        return {
          tasks: [],
          confidence: "low",
          error:
            e instanceof Error ? e.message : "Could not read homework.",
        };
      } finally {
        setLoading(false);
      }
    },
    [patchState],
  );

  const startSelectedTasks = useCallback(
    async (tasks: HomeworkTask[]) => {
      if (!tasks.length) return;

      setLoading(true);
      try {
        let roomCode = activeState.code;
        if (settings.deviceMode === "phone_tv" && !roomCode) {
          roomCode = await createSupabaseRoomClient({
            ...activeState,
            tasks,
            controller: "tv",
          });
        }

        patchState({
          tasks,
          currentTaskIndex: 0,
          code: roomCode,
          phase: "task_intro",
          avatarState: "idle",
          statusMessage: `${tasks.length} task${tasks.length > 1 ? "s" : ""} ready`,
          messages: [],
        });

        if (settings.deviceMode === "phone_only" || controller === "tv") {
          await startTaskAt(0, tasks);
        } else if (settings.deviceMode === "phone_tv" && controller === "phone") {
          const msg =
            settings.languageMode === "pure_telugu"
              ? "TV lo code enter cheyyandi. Homework ready!"
              : "Enter the code on TV. Homework is ready!";
          patchState({ statusMessage: msg, lastReply: msg });
          if (roomCode) await speak(msg);
        }
      } finally {
        setLoading(false);
      }
    },
    [
      activeState,
      controller,
      patchState,
      settings.deviceMode,
      settings.languageMode,
      speak,
      startTaskAt,
    ],
  );

  const jumpToTask = useCallback(
    async (index: number) => {
      if (index < 0 || index >= activeState.tasks.length) return;
      await startTaskAt(index);
    },
    [activeState.tasks.length, startTaskAt],
  );

  const transcribeToText = useCallback(async (blob: Blob): Promise<string | null> => {
    const form = new FormData();
    form.append("audio", blob, "recording.webm");
    const res = await fetch("/api/transcribe", { method: "POST", body: form });
    if (!res.ok) return null;
    const data = (await res.json()) as { transcript: string };
    return data.transcript?.trim() || null;
  }, []);

  const handleExplainAgain = useCallback(async () => {
    void track("explain_again", { attempt: activeState.attemptCount + 1 });
    const attempt = activeState.attemptCount + 1;
    patchState({ attemptCount: attempt });
    const note = buildExplainAgainPrompt(settings.languageMode, attempt);
    await teachCurrentTask(note);
  }, [activeState.attemptCount, patchState, settings.languageMode, teachCurrentTask]);

  const handleDoubt = useCallback(async () => {
    if (!doubtInput.trim()) return;
    void track("doubt_submitted", { doubt: doubtInput.slice(0, 200) });
    recordStudentOutcome(
      "doubt",
      activeState.tasks[activeState.currentTaskIndex],
      doubtInput.slice(0, 200),
    );
    patchState({ phase: "doubt", doubtText: doubtInput });
    await teachCurrentTask(`Student doubt: ${doubtInput}`);
    setDoubtInput("");
  }, [
    doubtInput,
    patchState,
    teachCurrentTask,
    recordStudentOutcome,
    activeState.tasks,
    activeState.currentTaskIndex,
  ]);

  const handleUnderstood = useCallback(async () => {
    void track("understood", { attempt: activeState.attemptCount + 1 });
    recordStudentOutcome(
      "understood",
      activeState.tasks[activeState.currentTaskIndex],
    );
    const nextIndex = activeState.currentTaskIndex + 1;
    if (nextIndex >= activeState.tasks.length) {
      patchState({ phase: "session_done", statusMessage: "All done! Great job!" });
      void track("session_completed", {});
      await speak(
        settings.languageMode === "pure_telugu"
          ? "బాగా చేశావ్! రేపు malli kaludam!"
          : "Great job! See you next time!",
      );
      return;
    }
    void track("task_completed", { index: activeState.currentTaskIndex });
    patchState({
      currentTaskIndex: nextIndex,
      attemptCount: 0,
      phase: "task_intro",
    });
    await startTask();
  }, [
    activeState.attemptCount,
    activeState.currentTaskIndex,
    activeState.tasks,
    activeState.tasks.length,
    patchState,
    settings.languageMode,
    speak,
    startTask,
    recordStudentOutcome,
  ]);

  const handleNotUnderstood = useCallback(async () => {
    const nextAttempt = activeState.attemptCount + 1;
    if (nextAttempt >= MAX_ATTEMPTS) {
      recordStudentOutcome(
        "struggled",
        activeState.tasks[activeState.currentTaskIndex],
      );
      patchState({
        phase: "parent_needed",
        statusMessage:
          settings.languageMode === "pure_telugu"
            ? "తల్లిదండ్రులను pilavandi"
            : "Call your parent for help",
      });
      await speak(
        settings.languageMode === "pure_telugu"
          ? "ఇంకా ardam kaledu. Amma or Nanna ni pilavandi."
          : "Still stuck? Call your parent.",
      );
      return;
    }
    await handleExplainAgain();
  }, [
    activeState.attemptCount,
    activeState.tasks,
    activeState.currentTaskIndex,
    handleExplainAgain,
    patchState,
    settings.languageMode,
    speak,
    recordStudentOutcome,
  ]);

  const unlockParentSolution = useCallback(async () => {
    if (!verifyParentPin(pinInput)) {
      patchState({ statusMessage: "Wrong PIN" });
      return;
    }
    const task = activeState.tasks[activeState.currentTaskIndex];
    if (!task) return;

    setLoading(true);
    void track("parent_unlock", { subject: task.subject });

    try {
      const res = await fetch("/api/solution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: pinInput,
          subject: task.subject,
          task: task.task,
          languageMode: settings.languageMode,
        }),
      });
      if (!res.ok) throw new Error("solution failed");
      const data = (await res.json()) as { solution: string };
      patchState({
        phase: "parent_solution",
        parentSolution: data.solution,
        statusMessage: "Parent solution",
      });
    } catch {
      patchState({ statusMessage: "Could not load solution" });
    } finally {
      setLoading(false);
      setPinInput("");
    }
  }, [
    activeState.currentTaskIndex,
    activeState.tasks,
    patchState,
    pinInput,
    settings.languageMode,
  ]);

  useEffect(() => {
    setAnalyticsContext({
      deviceMode: settings.deviceMode,
      inviteCode: profile.inviteCode,
      childName: profile.childName,
      languageMode: settings.languageMode,
    });
    void track("app_open", {});
    if (!sessionTrackedRef.current) {
      sessionTrackedRef.current = true;
      void track("session_start", {});
    }
    return () => {
      void track("session_end", {
        durationMin: Math.round((Date.now() - activeState.sessionStartedAt) / 60000),
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      controller !== "tv" ||
      activeState.phase !== "task_intro" ||
      !activeState.tasks.length ||
      activeState.currentExplanation
    ) {
      return;
    }
    void startTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller, activeState.code, activeState.tasks.length]);

  return {
    state: activeState,
    loading,
    doubtInput,
    setDoubtInput,
    pinInput,
    setPinInput,
    extractHomeworkForReview,
    startSelectedTasks,
    jumpToTask,
    transcribeToText,
    handleExplainAgain,
    handleDoubt,
    handleUnderstood,
    handleNotUnderstood,
    unlockParentSolution,
    startTask,
    speak,
    settings,
    isTv: isTvDevice(),
  };
}
