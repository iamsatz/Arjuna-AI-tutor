"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildScopeKey,
  buildStudentKey,
  type ChildProfile,
} from "@/lib/childProfile";
import { buildGreeting, buildExplainAgainPrompt, buildHintOnlyPrompt } from "@/lib/prompts";
import type { LessonState } from "@/lib/lessonTypes";
import { createInitialLessonState } from "@/lib/lessonTypes";
import { loadSettings, verifyParentPin, type DeviceMode, type LanguageMode } from "@/lib/settings";
import type { HomeworkTask } from "@/lib/types";
import { track, setAnalyticsContext } from "@/lib/analytics";
import { arjunaFetch, getGeminiKeyHeader } from "@/lib/apiClient";
import { normalizeTeachingMethod } from "@/lib/teachingMethods";
import { playSpeech } from "@/lib/clientSpeech";
import { stripSpeechMarkers } from "@/lib/bridgeSubject";
import {
  createSupabaseRoomClient,
  useSupabaseRoomPublisher,
} from "@/hooks/useSupabaseRoom";
import { isTvDevice } from "@/lib/platform";
import { friendlyExtractError, MISSING_AI_KEY_MESSAGE } from "@/lib/userErrors";

const MAX_ATTEMPTS = 4;
const MAX_VERIFY_ATTEMPTS = 3;

function localizedCopy(
  languageMode: LanguageMode,
  key:
    | "ask_explain"
    | "ask_help_mode"
    | "try_self"
    | "capture_answer"
    | "verify_correct"
    | "verify_wrong",
): string {
  const table: Record<
    typeof key,
    Record<LanguageMode, string>
  > = {
    ask_explain: {
      pure_telugu:
        "Nenu ee question explain cheyala? Ledante nuvve try chestava?",
      english: "Do you want me to explain this question, or will you try yourself?",
      mixed:
        "Do you want me to explain this question? Ledante nuvve try chestava?",
    },
    ask_help_mode: {
      pure_telugu: "Hint kavala, full explain kavala, leka nuvve try chestava?",
      english: "Want a hint, a full explanation, or will you try yourself?",
      mixed: "Hint kavala, full ga explain cheyala, leka nuvve try chestava?",
    },
    try_self: {
      pure_telugu: "Baga! Answer raasi aipoyaka photo teesi chupinchu.",
      english: "Great! Do the answer, then take a photo when you're done.",
      mixed: "Try cheyyi! Aipoyaka answer photo teesi chupinchu.",
    },
    capture_answer: {
      pure_telugu: "Nee answer photo teesi chupinchu.",
      english: "Take a photo of your written answer.",
      mixed: "Nee answer photo capture cheyyi.",
    },
    verify_correct: {
      pure_telugu: "Baga chesav! Correct!",
      english: "Well done! That's correct!",
      mixed: "Super! Correct answer!",
    },
    verify_wrong: {
      pure_telugu: "Inka konchem — malli try cheyyi.",
      english: "Not quite — try again with this hint.",
      mixed: "Inka konchem — hint tho malli try cheyyi.",
    },
  };
  return table[key][languageMode] ?? table[key].mixed;
}

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
        patchState({
          statusMessage:
            "Voice is not working right now. Try typing your homework instead.",
        });
      } finally {
        patchState({ avatarState: "idle" });
      }
    },
    [patchState, settings.languageMode],
  );

  const teachCurrentTask = useCallback(
    async (
      contextNote?: string,
      taskIndex?: number,
      tasksList?: HomeworkTask[],
      teachMode: "full" | "hint" = "full",
    ) => {
      const list = tasksList ?? activeState.tasks;
      const idx = taskIndex ?? activeState.currentTaskIndex;
      const task = list[idx];
      if (!task) return;

      setLoading(true);
      patchState({ avatarState: "loading", phase: "teaching" });

      const noteLine = task.notes?.trim()
        ? `Child/parent note: ${task.notes.trim()}. `
        : "";
      const hintRule =
        teachMode === "hint" ? `${buildHintOnlyPrompt(settings.languageMode)} ` : "";
      const baseContext =
        contextNote ??
        `${noteLine}${hintRule}Teach this task: ${task.subject} — ${task.task}`;
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
        const response = await arjunaFetch("/api/chat", {
          method: "POST",
          json: {
            messages,
            contextNote: chatContext,
            childName: profile.childName,
            grade: profile.grade,
            board: profile.board,
            method: normalizeTeachingMethod(profile.method),
            medium: profile.medium ?? "english_medium",
            languageMode: settings.languageMode,
            studentKey,
            scopeKey,
            subject: task.subject,
            topic: task.task,
          },
        });
        if (!response.ok) {
          const errBody = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          patchState({
            statusMessage:
              errBody.error === "missing_api_key"
                ? MISSING_AI_KEY_MESSAGE
                : "Something went wrong. Try again.",
          });
          return;
        }
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
      const askMsg = localizedCopy(settings.languageMode, "ask_explain");
      patchState({
        currentTaskIndex: index,
        attemptCount: 0,
        verifyAttemptCount: 0,
        phase: "ask_explain",
        statusMessage: askMsg,
        lastReply: askMsg,
      });
      await speak(askMsg);
    },
    [activeState.tasks, patchState, settings.languageMode, speak],
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
          if (profile.schoolName?.trim()) {
            form.append("schoolName", profile.schoolName.trim());
          }
          if (profile.grade?.trim()) {
            form.append("grade", profile.grade.trim());
          }
          if (profile.board) {
            form.append("board", profile.board);
          }
          const res = await fetch("/api/extract-tasks", {
            method: "POST",
            headers: getGeminiKeyHeader(),
            body: form,
          });
          const body = (await res.json()) as {
            tasks?: HomeworkTask[];
            confidence?: string;
            reason?: string;
            error?: string;
            message?: string;
          };
          if (!res.ok && !body.tasks?.length) {
            return {
              tasks: [],
              confidence: "low",
              error: friendlyExtractError(body.error, body.message),
            };
          }
          if (body.error && !body.tasks?.length) {
            return {
              tasks: [],
              confidence: body.confidence ?? "low",
              error: friendlyExtractError(body.error, body.message),
            };
          }
          result = {
            tasks: body.tasks ?? [],
            confidence: body.confidence ?? "medium",
            reason: body.reason,
          };
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
          const res = await arjunaFetch("/api/extract-tasks", {
            method: "POST",
            json: {
              text: combined,
              diaryNote: input.diaryNote?.trim(),
            },
          });
          const body = (await res.json()) as {
            tasks?: HomeworkTask[];
            confidence?: string;
            reason?: string;
            error?: string;
            message?: string;
          };
          if (!res.ok && !body.tasks?.length) {
            return {
              tasks: [],
              confidence: "low",
              error: friendlyExtractError(body.error, body.message),
            };
          }
          if (body.error && !body.tasks?.length) {
            return {
              tasks: [],
              confidence: body.confidence ?? "low",
              error: friendlyExtractError(body.error, body.message),
            };
          }
          result = {
            tasks: body.tasks ?? [],
            confidence: body.confidence ?? "medium",
            reason: body.reason,
          };
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
          error: friendlyExtractError(
            e instanceof Error ? e.message : "extract_failed",
          ),
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
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string };
      patchState({
        statusMessage:
          errBody.error === "missing_api_key"
            ? MISSING_AI_KEY_MESSAGE
            : "Could not hear you. Try again or type your homework.",
      });
      return null;
    }
    const data = (await res.json()) as { transcript: string };
    const text = data.transcript?.trim() || null;
    if (!text) {
      patchState({
        statusMessage: "Could not hear you. Try again or type your homework.",
      });
    }
    return text;
  }, [patchState]);

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

  const handleExplainChoice = useCallback(
    async (wantsExplain: boolean) => {
      if (wantsExplain) {
        const msg = localizedCopy(settings.languageMode, "ask_help_mode");
        patchState({
          phase: "ask_help_mode",
          statusMessage: msg,
          lastReply: msg,
        });
        await speak(msg);
        return;
      }
      const msg = localizedCopy(settings.languageMode, "try_self");
      patchState({
        phase: "try_self",
        statusMessage: msg,
        lastReply: msg,
      });
      await speak(msg);
    },
    [patchState, settings.languageMode, speak],
  );

  const handleHelpMode = useCallback(
    async (mode: "hint" | "explain" | "try_self") => {
      if (mode === "try_self") {
        const msg = localizedCopy(settings.languageMode, "try_self");
        patchState({
          phase: "try_self",
          statusMessage: msg,
          lastReply: msg,
        });
        await speak(msg);
        return;
      }
      await teachCurrentTask(
        undefined,
        activeState.currentTaskIndex,
        activeState.tasks,
        mode === "hint" ? "hint" : "full",
      );
    },
    [
      activeState.currentTaskIndex,
      activeState.tasks,
      patchState,
      settings.languageMode,
      speak,
      teachCurrentTask,
    ],
  );

  const handleReadyToTry = useCallback(async () => {
    const msg = localizedCopy(settings.languageMode, "try_self");
    patchState({
      phase: "try_self",
      statusMessage: msg,
      lastReply: msg,
    });
    await speak(msg);
  }, [patchState, settings.languageMode, speak]);

  const handleStartAnswerCapture = useCallback(async () => {
    const msg = localizedCopy(settings.languageMode, "capture_answer");
    patchState({
      phase: "capture_answer",
      statusMessage: msg,
      lastReply: msg,
    });
    await speak(msg);
  }, [patchState, settings.languageMode, speak]);

  const handleVerifyAnswer = useCallback(
    async (file: File) => {
      const task = activeState.tasks[activeState.currentTaskIndex];
      if (!task) return;

      setLoading(true);
      patchState({ avatarState: "loading", statusMessage: "Checking your answer…" });

      try {
        const form = new FormData();
        form.append("photo", file);
        form.append("subject", task.subject);
        form.append("task", task.task);
        form.append("languageMode", settings.languageMode);
        if (profile.grade) form.append("grade", profile.grade);

        const res = await fetch("/api/verify-answer", {
          method: "POST",
          headers: getGeminiKeyHeader(),
          body: form,
        });
        const data = (await res.json()) as {
          correct?: boolean;
          feedback?: string;
          hint?: string;
          error?: string;
        };

        if (!res.ok || data.error === "missing_api_key") {
          patchState({
            phase: "try_self",
            statusMessage: MISSING_AI_KEY_MESSAGE,
            avatarState: "idle",
          });
          return;
        }

        if (data.correct) {
          const msg = data.feedback || localizedCopy(settings.languageMode, "verify_correct");
          patchState({
            phase: "verify_result",
            lastVerifyCorrect: true,
            statusMessage: msg,
            lastReply: msg,
            avatarState: "idle",
          });
          await speak(msg);
          void track("answer_verified", { correct: true, subject: task.subject });
          return;
        }

        const nextVerify = (activeState.verifyAttemptCount ?? 0) + 1;
        if (nextVerify >= MAX_VERIFY_ATTEMPTS) {
          recordStudentOutcome("struggled", task);
          patchState({
            phase: "parent_needed",
            verifyAttemptCount: nextVerify,
            statusMessage:
              settings.languageMode === "pure_telugu"
                ? "తల్లిదండ్రులను pilavandi"
                : "Call your parent for help",
            avatarState: "idle",
          });
          await speak(
            settings.languageMode === "pure_telugu"
              ? "Inka kastam. Amma or Nanna ni pilavandi."
              : "Still stuck? Call your parent.",
          );
          return;
        }

        const hintLine = data.hint ?? data.feedback;
        const msg = `${localizedCopy(settings.languageMode, "verify_wrong")} ${hintLine}`;
        patchState({
          phase: "try_self",
          verifyAttemptCount: nextVerify,
          statusMessage: msg,
          lastReply: msg,
          lastVerifyCorrect: false,
          avatarState: "idle",
        });
        await speak(msg);
        void track("answer_verified", { correct: false, subject: task.subject });
      } catch {
        patchState({
          phase: "try_self",
          statusMessage: "Could not check. Try a clearer photo.",
          avatarState: "idle",
        });
      } finally {
        setLoading(false);
      }
    },
    [
      activeState.currentTaskIndex,
      activeState.tasks,
      activeState.verifyAttemptCount,
      patchState,
      profile.grade,
      recordStudentOutcome,
      settings.languageMode,
      speak,
    ],
  );

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
      verifyAttemptCount: 0,
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
      const res = await arjunaFetch("/api/solution", {
        method: "POST",
        json: {
          pin: pinInput,
          subject: task.subject,
          task: task.task,
          languageMode: settings.languageMode,
        },
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
    handleExplainChoice,
    handleHelpMode,
    handleReadyToTry,
    handleStartAnswerCapture,
    handleVerifyAnswer,
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
