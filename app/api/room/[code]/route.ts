import { NextResponse } from "next/server";
import { getRoom, markTvLinked, updateRoom } from "@/lib/roomStore";
import type { RoomSyncState } from "@/lib/roomSync";

type RouteParams = { params: { code: string } };

export async function GET(_request: Request, { params }: RouteParams) {
  const code = params.code.trim();
  const room = getRoom(code);

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  return NextResponse.json({
    code: room.code,
    avatarState: room.avatarState,
    statusMessage: room.statusMessage,
    isRecording: room.isRecording,
    speaker: room.speaker,
    phase: room.phase,
    lastReply: room.lastReply,
    tvLinked: room.tvLinked,
    updatedAt: room.updatedAt,
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const code = params.code.trim();
  const body = (await request.json()) as Partial<RoomSyncState> & {
    role?: "phone" | "tv";
  };

  if (body.role === "tv") {
    const linked = markTvLinked(code);
    if (!linked) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, tvLinked: true });
  }

  const { role: _role, ...patch } = body;
  const room = updateRoom(code, patch);

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, updatedAt: room.updatedAt });
}
