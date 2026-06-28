import { NextRequest, NextResponse } from "next/server";
import { createInvite, readInvites } from "@/lib/invitesStore";

export async function GET() {
  try {
    const invites = await readInvites();
    return NextResponse.json({ invites });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load invites";
    return NextResponse.json({ error: "read_failed", message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { label?: string };
    const invite = await createInvite(body.label);
    return NextResponse.json({ invite });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create invite";
    return NextResponse.json({ error: "create_failed", message }, { status: 500 });
  }
}
