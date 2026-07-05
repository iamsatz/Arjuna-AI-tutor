import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const sb = getSupabaseServer();
  if (!sb) {
    return NextResponse.json({ feedback: [], warning: "missing_config" });
  }

  const { data, error } = await sb
    .from("arjuna_feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ feedback: data ?? [] });
}
