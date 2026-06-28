"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChildProfile } from "@/lib/childProfile";
import { buildGreeting, buildExplainAgainPrompt } from "@/lib/prompts";
import type { LessonState } from "@/lib/lessonTypes";
import { createInitialLessonState } from "@/lib/lessonTypes";
import { loadSettings, verifyParentPin, type DeviceMode, type LanguageMode } from "@/lib/settings";
import type { HomeworkTask } from "@/lib/types";
import { track, setAnalyticsContext } from "@/lib/analytics";
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionTrackedRef = useRef(false);

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
      patchState({ avatarState: "loading", lastReply: text });
      try {
        const response = await fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            speaker: "shubh",
            languageMode: settings.languageMode,
          }),
        });
        if (!response.ok) throw new Error("speak failed");
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        if (audioRef.current) {
          audioRef.current.pause();
          URL.revokeObjectURL(audioRef.current.src);
        }
        const audio = new Audio(url);
        audioRef.current = audio;
        await new Promise<void>((resolve, reject) => {
          audio.onplay = () => patchState({ avatarState: "speaking" });
          audio.onended = () => {
            patchState({ avatarState: "idle" });
            resolve();
          };
          audio.onerror = () => reject(new Error("audio error"));
          void audio.play();
        });
      } catch {
        patchState({ avatarState: "idle" });
      }
    },
    [patchState, settings.languageMode],
  );

  const teachCurrentTask = useCallback(
    async (contextNote?: string) => {
      const task = activeState.tasks[activeState.currentTaskIndex];
      if (!task) return;

      setLoading(true);
      patchState({ avatarState: "loading", phase: "teaching" });

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
          content: contextNote ?? `Teach this task: ${task.subject} — ${task.task}`,
        },
      ];

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages,
            contextNote: contextNote ?? `Current task: ${task.subject} — ${task.task}`,
            childName: profile.childName,
            grade: profile.grade,
            board: profile.board,
            languageMode: settings.languageMode,
          }),
        });
        if (!response.ok) throw new Error("chat failed");
        const data = (await response.json()) as { reply: string };
        const reply = data.reply || intro;

        patchState({
          messages: [...messages, { role: "assistant", content: reply }],
          currentExplanation: reply,
          statusMessage: reply,
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
      settings.languageMode,
      speak,
    ],
  );

  const startTask = useCallback(async () => {
    const task = activeState.tasks[activeState.currentTaskIndex];
    if (!task) return;
    void track("task_started", { subject: task.subject, task: task.task });
    patchState({
      attemptCount: 0,
      phase: "task_intro",
      statusMessage: `Starting ${task.subject}…`,
    });
    await teachCurrentTask();
  }, [activeState.currentTaskIndex, activeState.tasks, patchState, teachCurrentTask]);

  const extractTasks = useCallback(
    async (input: { type: "photo"; file: File } | { type: "text"; text: string }) => {
      setLoading(true);
      patchState({ avatarState: "loading", statusMessage: "Reading homework…" });

      try {
        let result: { tasks: HomeworkTask[]; confidence: string };
        if (input.type === "photo") {
          const form = new FormData();
          form.append("photo", input.file);
          const res = await fetch("/api/extract-tasks", { method: "POST", body: form });
          if (!res.ok) throw new Error("extract failed");
          result = await res.json();
        } else {
          const res = await fetch("/api/extract-tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: input.text }),
          });
          if (!res.ok) throw new Error("extract failed");
          result = await res.json();
        }

        void track("homework_input", {
          inputType: input.type,
          tasksCount: result.tasks?.length ?? 0,
        });

        if (!result.tasks?.length || result.confidence === "low") {
          patchState({
            avatarState: "idle",
            statusMessage: "Could not read homework. Try again.",
          });
          return;
        }

        let roomCode = activeState.code;
        if (settings.deviceMode === "phone_tv" && !roomCode) {
          roomCode = await createSupabaseRoomClient({
            ...activeState,
            tasks: result.tasks,
            controller: "tv",
          });
        }

        patchState({
          tasks: result.tasks,
          currentTaskIndex: 0,
          code: roomCode,
          phase: "task_intro",
          avatarState: "idle",
          statusMessage: `${result.tasks.length} tasks found`,
        });

        if (settings.deviceMode === "phone_only" || controller === "tv") {
          await startTask();
        } else if (settings.deviceMode === "phone_tv" && controller === "phone") {
          const msg =
            settings.languageMode === "pure_telugu"
              ? "TV lo code enter cheyyandi. Homework ready!"
              : "Enter the code on TV. Homework is ready!";
          patchState({ statusMessage: msg, lastReply: msg });
          if (roomCode) await speak(msg);
        }
      } catch {
        patchState({
          avatarState: "idle",
          statusMessage: "Something went wrong.",
        });
      } finally {
        setLoading(false);
      }
    },
    [activeState, controller, patchState, settings.deviceMode, settings.languageMode, speak, startTask],
  );

  const transcribeAndExtract = useCallback(
    async (blob: Blob) => {
      const form = new FormData();
      form.append("audio", blob, "recording.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      if (!res.ok) throw new Error("transcribe failed");
      const data = (await res.json()) as { transcript: string };
      if (!data.transcript?.trim()) {
        patchState({ statusMessage: "Didn't catch that. Try again." });
        return;
      }
      await extractTasks({ type: "text", text: data.transcript });
    },
    [extractTasks, patchState],
  );

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
    patchState({ phase: "doubt", doubtText: doubtInput });
    await teachCurrentTask(`Student doubt: ${doubtInput}`);
    setDoubtInput("");
  }, [doubtInput, patchState, teachCurrentTask]);

  const handleUnderstood = useCallback(async () => {
    void track("understood", { attempt: activeState.attemptCount + 1 });
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
    activeState.tasks.length,
    patchState,
    settings.languageMode,
    speak,
    startTask,
  ]);

  const handleNotUnderstood = useCallback(async () => {
    const nextAttempt = activeState.attemptCount + 1;
    if (nextAttempt >= MAX_ATTEMPTS) {
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
  }, [activeState.attemptCount, handleExplainAgain, patchState, settings.languageMode, speak]);

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
    extractTasks,
    transcribeAndExtract,
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
