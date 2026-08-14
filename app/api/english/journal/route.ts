import { NextRequest, NextResponse } from "next/server";
import { journalListenReply } from "@/lib/gemini";
import { missingGeminiResponse } from "@/lib/userErrors";
import { resolveGeminiKey } from "@/lib/resolveApiKey";
import { requireInvite } from "@/lib/apiAuth";

export async function POST(request: NextRequest) {
  const denied = await requireInvite(request);
  if (denied) return denied;
  const body = (await request.json()) as {
    childName?: string;
    languageMode?: "english" | "pure_telugu" | "mixed";
    prompt?: string;
    kidText?: string;
  };

  const apiKey = resolveGeminiKey(request);
  if (!apiKey) return missingGeminiResponse();

  if (!body.kidText?.trim() || !body.prompt?.trim()) {
    return NextResponse.json({ error: "prompt and kidText required" }, { status: 400 });
  }

  try {
    const reply = await journalListenReply(apiKey, {
      childName: body.childName ?? "friend",
      languageMode: body.languageMode ?? "mixed",
      prompt: body.prompt,
      kidText: body.kidText.trim(),
    });
    return NextResponse.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "journal failed";
    return NextResponse.json({ error: "journal_failed", message }, { status: 502 });
  }
}
