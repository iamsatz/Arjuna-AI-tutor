import { NextRequest, NextResponse } from "next/server";
import { journalListenReply } from "@/lib/gemini";
import { missingGeminiResponse } from "@/lib/userErrors";
import { geminiKeyFromValue, resolveGeminiKey } from "@/lib/resolveApiKey";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    childName?: string;
    languageMode?: "english" | "pure_telugu" | "mixed";
    prompt?: string;
    kidText?: string;
    geminiApiKey?: string;
  };

  const apiKey =
    geminiKeyFromValue(body.geminiApiKey) ?? resolveGeminiKey(request);
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
