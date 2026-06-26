import type { AvatarState } from "@/hooks/useArjunaSession";

export type RoomSyncState = {
  avatarState: AvatarState;
  statusMessage: string;
  isRecording: boolean;
  speaker: string;
  phase: string;
  lastReply: string;
  tvLinked: boolean;
  updatedAt: number;
};

export type RoomRecord = RoomSyncState & {
  code: string;
  createdAt: number;
};

export function createRoomCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function emptyRoomState(phase: string): Omit<RoomSyncState, "updatedAt"> {
  return {
    avatarState: "idle",
    statusMessage: "Waiting for phone…",
    isRecording: false,
    speaker: "shubh",
    phase,
    lastReply: "",
    tvLinked: false,
  };
}
