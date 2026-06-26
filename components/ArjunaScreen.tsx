"use client";

import { useRef } from "react";
import { ActionButton } from "./ActionButton";
import { ArjunaAvatar } from "./ArjunaAvatar";
import { PairingBadge } from "./PairingBadge";
import { V0ProgressPanel } from "./V0ProgressPanel";
import { useArjunaSession } from "@/hooks/useArjunaSession";
import { useRoomPublisher } from "@/hooks/useRoomSync";
import { SARVAM_SPEAKERS } from "@/lib/sarvam";

export function ArjunaScreen() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
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
  } = useArjunaSession();

  const phase = v0Locked ? "v0" : "alpha";
  const { code, tvLinked } = useRoomPublisher({
    avatarState,
    statusMessage,
    isRecording,
    speaker,
    phase,
    lastReply,
  });

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-between bg-arjuna-bg px-6 py-10">
      <div className="flex w-full flex-col items-center gap-4 pt-6">
        <p className="text-sm font-medium uppercase tracking-widest text-arjuna-muted">
          Arjuna · Class 2 {v0Locked ? "· V0" : "· Alpha"}
        </p>
        <ArjunaAvatar
          state={avatarState}
          onTap={() => void playGreeting()}
        />
        <p className="max-w-xs text-center text-base text-arjuna-text">
          {statusMessage}
        </p>

        <PairingBadge code={code} tvLinked={tvLinked} />

        {v0Locked && (
          <p className="max-w-xs rounded-xl bg-white/80 px-3 py-2 text-center text-xs text-arjuna-muted">
            V0 mode: voice test only. Talk and Photo unlock after family
            gate (see steps below).
          </p>
        )}

        <div className="flex flex-wrap justify-center gap-2">
          {SARVAM_SPEAKERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeaker(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                speaker === s
                  ? "bg-arjuna-primary text-white"
                  : "bg-white text-arjuna-muted"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handlePhoto(file);
          e.target.value = "";
        }}
      />

      <div className="flex w-full flex-col gap-4 pb-2">
        <ActionButton
          icon="📷"
          label="Diary Photo"
          disabled={v0Locked}
          onClick={() => {
            if (!v0Locked) fileInputRef.current?.click();
          }}
        />
        <ActionButton
          icon="🎤"
          label={isRecording ? "Stop" : "Talk"}
          disabled={v0Locked}
          onClick={() => void toggleTalk()}
        />
        <ActionButton
          icon="✅"
          label="Done"
          onClick={() => void endSession()}
        />
        <V0ProgressPanel />
      </div>
    </main>
  );
}
