import { NextResponse } from "next/server";
import { readSessions } from "@/lib/sessionsStore";

export async function GET() {
  try {
    const sessions = await readSessions();
    return NextResponse.json({ sessions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load sessions";
    return NextResponse.json({ error: "read_failed", message }, { status: 500 });
  }
}
