import { NextRequest, NextResponse } from "next/server";
import { resolveGeminiKey } from "@/lib/resolveApiKey";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function POST(request: NextRequest) {
  let bodyKey: string | undefined;
  try {
    const body = (await request.json()) as { geminiApiKey?: string };
    bodyKey = body.geminiApiKey;
  } catch {
    // no JSON body
  }

  const apiKey = resolveGeminiKey(request, bodyKey);

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "missing_api_key" },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: 'Reply with exactly: "ok"' }] }],
        generationConfig: { maxOutputTokens: 8, temperature: 0 },
      }),
    });

    if (response.ok) {
      return NextResponse.json({ ok: true });
    }

    // 429 = key is valid but hit the free-tier rate limit right now.
    if (response.status === 429) {
      return NextResponse.json({ ok: true, rateLimited: true });
    }

    const detail = await response.text();
    return NextResponse.json(
      {
        ok: false,
        error: "google_rejected",
        googleStatus: response.status,
        message: detail.slice(0, 280),
      },
      { status: 502 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Test failed";
    return NextResponse.json(
      { ok: false, error: "test_failed", message },
      { status: 502 },
    );
  }
}
