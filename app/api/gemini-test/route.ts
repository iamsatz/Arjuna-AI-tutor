import { NextRequest, NextResponse } from "next/server";
import { geminiKeyFromValue, resolveGeminiKey } from "@/lib/resolveApiKey";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function POST(request: NextRequest) {
  let apiKey = resolveGeminiKey(request);

  if (!apiKey) {
    try {
      const body = (await request.json()) as { geminiApiKey?: string };
      apiKey = geminiKeyFromValue(body.geminiApiKey);
    } catch {
      // use header/env only
    }
  }

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "missing_api_key" },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: 'Reply with exactly: "ok"' }] }],
        generationConfig: { maxOutputTokens: 8, temperature: 0 },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { ok: false, error: "invalid_key", message: detail.slice(0, 200) },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Test failed";
    return NextResponse.json({ ok: false, error: "test_failed", message }, { status: 502 });
  }
}
