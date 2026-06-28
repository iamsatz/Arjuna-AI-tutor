"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChildProfile } from "@/lib/childProfile";
import { buildGreeting } from "@/lib/childProfile";
import type { ChatMessage, HomeworkTask, SessionMeta } from "@/lib/types";
import { createSessionMeta } from "@/lib/types";
import { detectModeFromTask } from "@/lib/modes";
import { isV0Locked } from "@/lib/phase";

const SESSION_CAP_MS = 25 * 60 * 1000;
const WARN_20_MS = 20 * 60 * 1000;
const WARN_23_MS = 23 * 60 * 1000;
const SILENCE_CHECK_MS = 90 * 1000;
const SILENCE_BREAK_MS = 150 * 1000;
const SILENCE_CLOSE_MS = 300 * 1000;

export type AvatarState = "idle" | "speaking" | "loading" | "listening";

export function useArjunaSession(profile: ChildProfile) {
  const v0Locked = isV0Locked();
  const childName = profile.childName;
  const greeting = buildGreeting(childName);

  const [avatarState, setAvatarState] = useState<AvatarState>("loading");
  const [statusMessage, setStatusMessage] = useState(
    "Arjuna is getting ready…",
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [meta, setMeta] = useState<SessionMeta>(createSessionMeta);
  const [isRecording, setIsRecording] = useState(false);
  const [speaker, setSpeaker] = useState("shubh");
  const [lastReply, setLastReply] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const lastActivityRef = useRef(Date.now());
  const sessionEndedRef = useRef(false);
  const warned20Ref = useRef(false);
  const warned23Ref = useRef(false);
  const silenceStageRef = useRef(0);

  const touchActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    silenceStageRef.current = 0;
  }, []);

  const speak = useCallback(
    async (text: string) => {
      setAvatarState("loading");
      try {
        const response = await fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, speaker }),
        });

        if (!response.ok) {
          throw new Error("Could not speak");
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        if (audioRef.current) {
          audioRef.current.pause();
          URL.revokeObjectURL(audioRef.current.src);
        }

        const audio = new Audio(url);
        audioRef.current = audio;

        await new Promise<void>((resolve, reject) => {
          audio.onplay = () => setAvatarState("speaking");
          audio.onended = () => {
            setAvatarState("idle");
            resolve();
          };
          audio.onerror = () => reject(new Error("Audio error"));
          void audio.play();
        });
      } catch {
        setAvatarState("idle");
        setStatusMessage("Something went wrong. Tap Talk to try again.");
      }
    },
    [speaker],
  );

  const arjunaReply = useCallback(
    async (userText: string, contextNote?: string) => {
      const userMsg: ChatMessage = { role: "user", content: userText };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      touchActivity();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          contextNote,
          childName: profile.childName,
          grade: profile.grade,
        }),
      });

      if (!response.ok) {
        await speak("Something went wrong. Let's ask a parent for help.");
        return;
      }

      const data = (await response.json()) as { reply: string };
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.reply,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setLastReply(data.reply);

      if (/ask (a )?parent|amma ni adugudama/i.test(data.reply)) {
        setMeta((m) => ({
          ...m,
          askAmmaFlags: [...m.askAmmaFlags, userText.slice(0, 80)],
        }));
      }

      await speak(data.reply);
      setStatusMessage("Tap Talk when ready");
    },
    [messages, profile.childName, profile.grade, speak, touchActivity],
  );

  const playGreeting = useCallback(async () => {
    touchActivity();
    setStatusMessage("Arjuna is getting ready…");
    await speak(greeting);
    setLastReply(greeting);
    setStatusMessage(
      v0Locked
        ? "Try speakers above. Tap Arjuna to hear again."
        : "Tap Talk to speak, or Photo for diary",
    );
  }, [greeting, speak, touchActivity, v0Locked]);

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    setIsRecording(false);
    setAvatarState("loading");
    setStatusMessage("Arjuna is listening…");

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    chunksRef.current = [];

    const form = new FormData();
    form.append("audio", blob, "recording.webm");

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: form,
      });

      if (!response.ok) {
        throw new Error("Transcribe failed");
      }

      const data = (await response.json()) as { transcript: string };
      const text = data.transcript.trim();
      if (!text) {
        setStatusMessage("Didn't catch that. Try again?");
        setAvatarState("idle");
        return;
      }

      let contextNote: string | undefined;
      const task = meta.tasks[meta.currentTaskIndex];
      if (task) {
        contextNote = `Current homework: ${task.subject} — ${task.task}. Mode: ${meta.mode}. Strikes on this task: ${meta.strikesOnTask}.`;
      }

      if (/done|finished|aipoyindi/i.test(text) && meta.mode === "dictation") {
        setMeta((m) => ({ ...m, dictationProgress: m.dictationProgress + 1 }));
      }

      if (/don't know|naaku raadu|teliyadhu/i.test(text)) {
        setMeta((m) => {
          const strikes = m.strikesOnTask + 1;
          if (strikes >= 3) {
            return {
              ...m,
              strikesOnTask: 0,
              struggles: [...m.struggles, task?.task ?? "unknown"],
            };
          }
          return { ...m, strikesOnTask: strikes };
        });
      }

      await arjunaReply(text, contextNote);
    } catch {
      setAvatarState("idle");
      await speak("Something went wrong. Let's ask a parent for help.");
    }
  }, [arjunaReply, meta, speak]);

  const startRecording = useCallback(async () => {
    touchActivity();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setAvatarState("listening");
      setStatusMessage("Listening… tap Talk again when done");
    } catch {
      setStatusMessage("Mic permission needed. Ask a parent for help.");
    }
  }, [touchActivity]);

  const toggleTalk = useCallback(async () => {
    if (v0Locked) {
      setStatusMessage("Talk unlocks after V0 gate. Finish validation steps below.");
      return;
    }
    if (sessionEndedRef.current) return;
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording, v0Locked]);

  const handlePhoto = useCallback(
    async (file: File) => {
      if (v0Locked) {
        setStatusMessage("Photo unlocks after V0 gate. Finish validation steps below.");
        return;
      }
      touchActivity();
      setAvatarState("loading");
      setStatusMessage("Reading diary…");

      const attempts = meta.photoAttempts + 1;
      setMeta((m) => ({ ...m, photoAttempts: attempts }));

      const form = new FormData();
      form.append("photo", file);

      try {
        const response = await fetch("/api/photo", { method: "POST", body: form });
        const data = (await response.json()) as {
          tasks: HomeworkTask[];
          confidence: string;
          reason?: string;
        };

        if (!data.tasks?.length || data.confidence === "low") {
          if (attempts >= 2) {
            await speak(
              `No problem ${childName}! Ask a parent for help. I'll wait here.`,
            );
            setStatusMessage("Photo failed twice — ask a parent");
            return;
          }
          await speak(
            `${childName}, the photo isn't clear. Can you try again?`,
          );
          setStatusMessage("Try another photo");
          setAvatarState("idle");
          return;
        }

        setMeta((m) => ({
          ...m,
          tasks: data.tasks,
          photoAttempts: 0,
          currentTaskIndex: 0,
          mode: detectModeFromTask(data.tasks[0]?.task ?? ""),
        }));

        const list = data.tasks
          .map((t, i) => `${i + 1}. ${t.subject} — ${t.task}`)
          .join(". ");

        await arjunaReply(
          `[Diary photo uploaded. Tasks found: ${list}. Read these aloud to ${childName} and ask which one first.]`,
          `This is from diary photo — confirm tasks with ${childName} warmly.`,
        );
      } catch {
        await speak("Something went wrong. Let's ask a parent for help.");
        setAvatarState("idle");
      }
    },
    [arjunaReply, childName, meta.photoAttempts, speak, touchActivity, v0Locked],
  );

  const endSession = useCallback(async () => {
    if (v0Locked) {
      setStatusMessage("Nice! Talk and Photo come after V0 gate.");
      return;
    }
    if (sessionEndedRef.current) return;
    sessionEndedRef.current = true;
    setAvatarState("loading");

    const transcript = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const durationMin = Math.round((Date.now() - meta.startedAt) / 60000);

    await speak(
      `Great job today ${childName}! See you next time for more homework.`,
    );

    if (transcript.length > 20) {
      await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          durationMin,
          childName: profile.childName,
          inviteCode: profile.inviteCode,
        }),
      });
    }

    setStatusMessage("Session done! Summary sent to parents.");
    setAvatarState("idle");
  }, [childName, messages, meta.startedAt, profile.childName, profile.inviteCode, speak, v0Locked]);

  useEffect(() => {
    void playGreeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (v0Locked) return;

    const interval = setInterval(() => {
      if (sessionEndedRef.current || avatarState === "speaking") return;

      const elapsed = Date.now() - meta.startedAt;
      const silent = Date.now() - lastActivityRef.current;

      if (elapsed >= SESSION_CAP_MS) {
        void endSession();
        return;
      }

      if (elapsed >= WARN_23_MS && !warned23Ref.current) {
        warned23Ref.current = true;
        void speak("3 minutes left. One more question?");
      } else if (elapsed >= WARN_20_MS && !warned20Ref.current) {
        warned20Ref.current = true;
        void speak("Great work! 5 more minutes.");
      }

      if (silent >= SILENCE_CLOSE_MS && silenceStageRef.current < 3) {
        silenceStageRef.current = 3;
        void endSession();
      } else if (silent >= SILENCE_BREAK_MS && silenceStageRef.current < 2) {
        silenceStageRef.current = 2;
        void speak("Take a 2 minute break. I'll wait when you're back.");
      } else if (silent >= SILENCE_CHECK_MS && silenceStageRef.current < 1) {
        silenceStageRef.current = 1;
        void speak(
          `${childName}, are you okay? Stuck, or need a brain break?`,
        );
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [avatarState, childName, endSession, meta.startedAt, speak, v0Locked]);

  useEffect(() => {
    if (v0Locked) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (messages.length > 1 && !sessionEndedRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [messages.length, v0Locked]);

  return {
    avatarState,
    statusMessage,
    isRecording,
    speaker,
    setSpeaker,
    toggleTalk,
    handlePhoto,
    endSession,
    playGreeting,
    v0Locked,
    lastReply,
  };
}
