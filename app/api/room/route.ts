import { NextResponse } from "next/server";
import { createRoom } from "@/lib/roomStore";

export async function POST() {
  const phase = process.env.NEXT_PUBLIC_ARJUNA_PHASE?.trim() || "v0";
  const room = createRoom(phase);
  return NextResponse.json({ code: room.code });
}
