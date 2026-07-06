"use client";

import { useCallback, useEffect, useState } from "react";
import { ArjunaAvatar } from "@/components/ArjunaAvatar";
import { Button } from "@/components/ui/Button";
import { StepDots } from "@/components/ui/StepDots";
import { arjunaFetch } from "@/lib/apiClient";
import { playSpeech } from "@/lib/clientSpeech";
import { stripSpeechMarkers } from "@/lib/bridgeSubject";
import {
  ENGLISH_SESSION_STEPS,
  stepLabel,
  type EnglishConcept,
  type EnglishSessionStep,
} from "@/lib/englishConceptMap";
import { buildSchoolKey, buildStudentKey, type ChildProfile } from "@/lib/childProfile";
import { loadSettings } from "@/lib/settings";
import { recordDailyActivity } from "@/lib/streak";
import type { ChatMessage } from "@/lib/types";

type EnglishConceptSessionProps = {
  profile: ChildProfile;
  concept: EnglishConcept;
  onClose: () => void;
  onComplete?: () => void;
};

export function EnglishConceptSession({
  profile,
  concept,
  onClose,
  onComplete,
}: EnglishConceptSessionProps) {
  const settings = loadSettings();
  const [stepIndex, setStepIndex] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reply, setReply] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [avatarState, setAvatarState] = useState<"idle" | "loading" | "speaking">(
    "loading",
  );
  const [done, setDone] = useState(false);

  const step = ENGLISH_SESSION_STEPS[stepIndex];
  const studentKey = profile.id
    ? buildStudentKey(profile.inviteCode, profile.id)
    : undefined;
  const schoolKey = buildSchoolKey(
    profile.schoolName,
    profile.grade,
    profile.board,
  );

  const speak = useCallback(
    async (text: string) => {
      setAvatarState("speaking");
      try {
        await playSpeech(text, { languageMode: settings.languageMode });
      } catch {
        // ignore TTS errors
      } finally {
        setAvatarState("idle");
      }
    },
    [settings.languageMode],
  );

  const fetchStep = useCallback(
    async (currentStep: EnglishSessionStep, msgs: ChatMessage[]) => {
      setLoading(true);
      setAvatarState("loading");
      try {
        const res = await arjunaFetch("/api/english/concept", {
          method: "POST",
          json: {
            conceptId: concept.id,
            step: currentStep,
            messages: msgs,
            childName: profile.childName,
            grade: profile.grade,
            board: profile.board,
            method: profile.method,
            languageMode: settings.languageMode,
          },
        });
        const data = (await res.json()) as { reply?: string; message?: string };
        if (!res.ok) throw new Error(data.message ?? "Failed");
        const text = data.reply ?? "";
        setReply(text);
        setMessages((prev) => [...prev, { role: "assistant", content: text }]);
        await speak(text);
      } catch {
        setReply("Arjuna is resting. Try again in a moment.");
        setAvatarState("idle");
      } finally {
        setLoading(false);
      }
    },
    [
      concept.id,
      profile.childName,
      profile.grade,
      profile.board,
      profile.method,
      settings.languageMode,
      speak,
    ],
  );

  useEffect(() => {
    setMessages([]);
    setStepIndex(0);
    setDone(false);
    void fetchStep(ENGLISH_SESSION_STEPS[0], []);
  }, [concept.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const nextMsgs: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMsgs);
    await fetchStep(step, nextMsgs);
  }

  async function handleNextStep() {
    if (stepIndex >= ENGLISH_SESSION_STEPS.length - 1) {
      setLoading(true);
      try {
        const res = await arjunaFetch("/api/english/concept", {
          method: "POST",
          json: {
            conceptId: concept.id,
            step: "mini_check",
            messages,
            childName: profile.childName,
            languageMode: settings.languageMode,
            checkCompletion: true,
          },
        });
        const check = (await res.json()) as { passed?: boolean };
        const passed = check.passed !== false;

        if (studentKey) {
          await arjunaFetch("/api/student/outcome", {
            method: "POST",
            json: {
              studentKey,
              inviteCode: profile.inviteCode,
              childName: profile.childName,
              schoolKey: schoolKey ?? undefined,
              subject: "English",
              topic: concept.label,
              result: passed ? "understood" : "doubt",
              note: passed ? "English concept explain-back" : "Needs more practice",
            },
          });
        }

        recordDailyActivity("english");
        setDone(true);
        onComplete?.();
      } catch {
        recordDailyActivity("english");
        setDone(true);
        onComplete?.();
      } finally {
        setLoading(false);
      }
      return;
    }

    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    await fetchStep(ENGLISH_SESSION_STEPS[nextIndex], messages);
  }

  if (done) {
    return (
      <div className="rounded-3xl border-2 border-emerald-200 bg-emerald-50 p-5 text-center">
        <p className="text-3xl">🏹</p>
        <p className="mt-2 font-display text-lg font-bold text-emerald-900">
          Nice work, {profile.childName}!
        </p>
        <p className="mt-1 text-sm text-emerald-800">
          You practiced {concept.label}. +1 toward today!
        </p>
        <Button className="mt-4 w-full" onClick={onClose}>
          Back to English
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-display font-bold text-arjuna-text">{concept.label}</p>
          <p className="text-xs text-arjuna-muted">{concept.focus}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white px-3 py-1 text-sm font-semibold shadow-sm"
        >
          ✕
        </button>
      </div>

      <StepDots total={ENGLISH_SESSION_STEPS.length} current={stepIndex + 1} />
      <p className="-mt-2 text-center text-xs font-semibold text-arjuna-muted">
        Step {stepIndex + 1}: {stepLabel(step)}
      </p>

      <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-4 shadow-sm">
        <ArjunaAvatar state={avatarState} size="sm" />
        <p className="max-w-sm text-center text-sm font-medium text-arjuna-text">
          {reply ? stripSpeechMarkers(reply) : "Arjuna is thinking…"}
        </p>
        {reply && (
          <button
            type="button"
            onClick={() => void speak(reply)}
            className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800"
          >
            🔊 Hear again
          </button>
        )}
      </div>

      {step !== "explain" && step !== "examples" && (
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer…"
            className="flex-1 rounded-xl border p-3 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSend();
            }}
          />
          <Button onClick={() => void handleSend()} disabled={loading || !input.trim()}>
            Send
          </Button>
        </div>
      )}

      <Button
        variant="success"
        className="w-full"
        disabled={loading || !reply}
        onClick={() => void handleNextStep()}
      >
        {stepIndex >= ENGLISH_SESSION_STEPS.length - 1
          ? "Finish lesson"
          : `Next: ${stepLabel(ENGLISH_SESSION_STEPS[stepIndex + 1])}`}
      </Button>
    </div>
  );
}
