import { NextRequest, NextResponse } from "next/server";
import {
  createSupabaseRoom,
  getSupabaseRoom,
  markTvLinked,
  updateSupabaseRoom,
} from "@/lib/supabaseRoom";
import type { LessonState } from "@/lib/lessonTypes";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { initialState?: Partial<LessonState> };
  const room = await createSupabaseRoom(body.initialState ?? {});
  if (!room) {
    return NextResponse.json({ error: "room_create_failed" }, { status: 503 });
  }
  return NextResponse.json(room);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "code required" }, { status: 400 });
  }
  const room = await getSupabaseRoom(code);
  if (!room) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(room);
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as {
    code: string;
    role?: "phone" | "tv";
    state?: Partial<LessonState>;
  };

  if (!body.code) {
    return NextResponse.json({ error: "code required" }, { status: 400 });
  }

  if (body.role === "tv") {
    const linked = await markTvLinked(body.code);
    if (!linked) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, tv_linked: true });
  }

  const updated = await updateSupabaseRoom(body.code, { state: body.state });
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, state: updated.state });
}
