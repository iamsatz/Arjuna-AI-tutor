import { NextRequest } from "next/server";

const PLACEHOLDER = "your_gemini_api_key_here";

/** Google AI Studio keys start with AIzaSy. OAuth tokens (AQ.*) do not work with our API. */
export function describeGeminiKeyProblem(key: string): string | null {
  const trimmed = key.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("AQ.")) {
    return "Wrong key type (OAuth token). Use an API key from Google AI Studio — it starts with AIzaSy.";
  }
  if (trimmed.length > 12 && !trimmed.startsWith("AIzaSy")) {
    return "This key format is not supported. Get a free key at Google AI Studio (starts with AIzaSy).";
  }
  return null;
}

export function geminiKeyFromValue(value?: string | null): string | null {
  const key = value?.trim();
  if (!key || key === PLACEHOLDER) return null;
  return key;
}

/** Prefer explicit key from Settings/body, then request header, then server env. */
export function resolveGeminiKey(
  request: NextRequest,
  explicitKey?: string | null,
): string | null {
  const fromExplicit = geminiKeyFromValue(explicitKey);
  if (fromExplicit) return fromExplicit;

  const header = request.headers.get("x-gemini-key")?.trim();
  if (header && header !== PLACEHOLDER) return header;

  const env = process.env.GEMINI_API_KEY?.trim();
  if (env && env !== PLACEHOLDER) return env;

  return null;
}

export async function resolveGeminiKeyFromBody(
  request: NextRequest,
): Promise<string | null> {
  try {
    const clone = request.clone();
    const contentType = clone.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await clone.json()) as { geminiApiKey?: string };
      const fromBody = geminiKeyFromValue(body.geminiApiKey);
      if (fromBody) return fromBody;
    }
  } catch {
    // ignore
  }

  return resolveGeminiKey(request);
}
