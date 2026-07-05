import { NextRequest, NextResponse } from "next/server";
import { analyzeParentFeedback } from "@/lib/feedback";
import { getSupabaseServer } from "@/lib/supabase/server";
import { geminiKeyFromValue, resolveGeminiKey } from "@/lib/resolveApiKey";
import { missingGeminiResponse } from "@/lib/userErrors";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    rawText?: string;
    submittedBy?: "mother" | "father";
    inviteCode?: string;
    childName?: string;
    sessionId?: string;
    geminiApiKey?: string;
  };

  const apiKey =
    geminiKeyFromValue(body.geminiApiKey) ?? resolveGeminiKey(request);
  if (!apiKey) {
    return missingGeminiResponse();
  }

  const rawText = body.rawText?.trim();
  if (!rawText) {
    return NextResponse.json({ error: "rawText required" }, { status: 400 });
  }

  const submittedBy =
    body.submittedBy === "mother" || body.submittedBy === "father"
      ? body.submittedBy
      : "mother";

  try {
    const analysis = await analyzeParentFeedback(apiKey, rawText, {
      childName: body.childName,
      submittedBy,
    });

    const sb = getSupabaseServer();
    let id: string | null = null;

    if (sb) {
      const { data, error } = await sb
        .from("arjuna_feedback")
        .insert({
          invite_code: body.inviteCode ?? null,
          child_name: body.childName ?? null,
          submitted_by: submittedBy,
          raw_text: rawText,
          analysis,
          session_id: body.sessionId ?? null,
        })
        .select("id")
        .single();

      if (error) {
        console.error("arjuna_feedback insert", error);
      } else {
        id = data?.id ?? null;
      }
    }

    return NextResponse.json({ id, analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Feedback failed";
    return NextResponse.json({ error: "feedback_failed", message }, { status: 502 });
  }
}
