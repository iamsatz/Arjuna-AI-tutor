import { NextRequest } from "next/server";

const PLACEHOLDER = "your_gemini_api_key_here";

export function resolveGeminiKey(request: NextRequest): string | null {
  const header = request.headers.get("x-gemini-key")?.trim();
  if (header && header !== PLACEHOLDER) return header;

  const env = process.env.GEMINI_API_KEY?.trim();
  if (env && env !== PLACEHOLDER) return env;

  return null;
}

export async function resolveGeminiKeyFromBody(
  request: NextRequest,
): Promise<string | null> {
  const fromHeader = resolveGeminiKey(request);
  if (fromHeader) return fromHeader;

  try {
    const clone = request.clone();
    const contentType = clone.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await clone.json()) as { geminiApiKey?: string };
      const key = body.geminiApiKey?.trim();
      if (key && key !== PLACEHOLDER) return key;
    }
  } catch {
    // ignore
  }

  return null;
}

export function geminiKeyFromValue(value?: string | null): string | null {
  const key = value?.trim();
  if (!key || key === PLACEHOLDER) return null;
  return key;
}
