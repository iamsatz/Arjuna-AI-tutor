import { NextRequest, NextResponse } from "next/server";
import { resolveGeminiKey } from "@/lib/resolveApiKey";
import { requireInvite } from "@/lib/apiAuth";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function POST(request: NextRequest) {
  const denied = await requireInvite(request);
  if (denied) return denied;

  // The key being tested arrives in the `x-gemini-key` header like everywhere
  // else — never in the body, which would put it in the request logs.
  const apiKey = resolveGeminiKey(request);

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
