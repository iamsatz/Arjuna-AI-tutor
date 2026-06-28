import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const sb = getSupabaseServer();
  if (!sb) {
    return NextResponse.json(
      { error: "missing_config", message: "Add Supabase env vars" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    eventType: string;
    device?: string;
    deviceMode?: string;
    inviteCode?: string;
    childName?: string;
    languageMode?: string;
    payload?: Record<string, unknown>;
  };

  if (!body.eventType) {
    return NextResponse.json({ error: "eventType required" }, { status: 400 });
  }

  const { error } = await sb.from("arjuna_events").insert({
    event_type: body.eventType,
    device: body.device,
    device_mode: body.deviceMode,
    invite_code: body.inviteCode,
    child_name: body.childName,
    language_mode: body.languageMode,
    payload: body.payload ?? {},
  });

  if (error) {
    return NextResponse.json(
      { error: "insert_failed", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const sb = getSupabaseServer();
  if (!sb) {
    return NextResponse.json({ error: "missing_config" }, { status: 503 });
  }

  const { data, error } = await sb
    .from("arjuna_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data ?? [] });
}
