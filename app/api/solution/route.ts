import { NextRequest, NextResponse } from "next/server";
import { generateParentSolution } from "@/lib/gemini";
import { missingGeminiResponse } from "@/lib/userErrors";
import { geminiKeyFromValue, resolveGeminiKey } from "@/lib/resolveApiKey";
import type { LanguageMode } from "@/lib/settings";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    subject?: string;
    task?: string;
    languageMode?: LanguageMode;
    context?: string;
    pin?: string;
    geminiApiKey?: string;
  };

  const apiKey =
    geminiKeyFromValue(body.geminiApiKey) ?? resolveGeminiKey(request);
  if (!apiKey) {
    return missingGeminiResponse();
  }

  if (!body.pin || body.pin.length < 4) {
    return NextResponse.json({ error: "pin required" }, { status: 401 });
  }

  if (!body.subject || !body.task) {
    return NextResponse.json({ error: "subject and task required" }, { status: 400 });
  }

  try {
    const solution = await generateParentSolution(
      apiKey,
      body.subject,
      body.task,
      body.languageMode ?? "mixed",
      body.context,
    );
    return NextResponse.json({ solution });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Solution failed";
    return NextResponse.json({ error: "solution_failed", message }, { status: 502 });
  }
}
