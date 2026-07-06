import { NextResponse } from "next/server";

/** Parent-friendly copy when AI key is missing. */
export const MISSING_AI_KEY_MESSAGE =
  "Ask Amma or Nanna to add the AI key in Settings.";

/** Map server/API errors to parent-friendly copy (never show .env.local). */
export function friendlyExtractError(
  error?: string | null,
  message?: string | null,
): string {
  const raw = `${error ?? ""} ${message ?? ""}`.toLowerCase();
  if (raw.includes("missing_api_key") || raw.includes(".env.local")) {
    return MISSING_AI_KEY_MESSAGE;
  }
  if (
    raw.includes("401") ||
    raw.includes("unauthenticated") ||
    raw.includes("invalid authentication") ||
    raw.includes("google_rejected") ||
    raw.includes("access_token")
  ) {
    return "AI key is not working. Open Settings → Test connection, or create a fresh key at Google AI Studio.";
  }
  if (raw.includes("429") || raw.includes("rate limit") || raw.includes("resource_exhausted")) {
    return "Google's free limit is busy. Wait a minute and try again.";
  }
  if (raw.includes("extract_failed") || raw.includes("gemini failed")) {
    return "Couldn't read the photo clearly — add or fix tasks below.";
  }
  if (raw.includes("pdf_unsupported")) {
    return friendlyPdfExtractError();
  }
  if (message?.trim() && !message.includes(".env.local")) {
    return message.trim();
  }
  if (error?.trim() && !error.includes(".env.local")) {
    return error.trim();
  }
  return "Couldn't read the photo clearly — add or fix tasks below.";
}

/** Map /api/chat and teach failures to kid-friendly copy. */
export function friendlyChatError(
  error?: string | null,
  message?: string | null,
): string {
  const raw = `${error ?? ""} ${message ?? ""}`.toLowerCase();
  if (raw.includes("missing_api_key") || raw.includes(".env.local")) {
    return MISSING_AI_KEY_MESSAGE;
  }
  if (
    raw.includes("401") ||
    raw.includes("unauthenticated") ||
    raw.includes("invalid authentication") ||
    raw.includes("google_rejected") ||
    raw.includes("access_token")
  ) {
    return "AI key is not working. Open Settings → Test connection, or create a fresh key at Google AI Studio.";
  }
  if (
    raw.includes("429") ||
    raw.includes("rate limit") ||
    raw.includes("resource_exhausted")
  ) {
    return "Google's free limit is busy. Wait a minute and try again.";
  }
  if (raw.includes("chat_failed") || raw.includes("gemini failed")) {
    return "Arjuna couldn't reply right now. Tap Retry in a moment.";
  }
  if (message?.trim() && !message.includes(".env.local")) {
    return message.trim().slice(0, 200);
  }
  if (error?.trim() && !error.includes(".env.local")) {
    return error.trim();
  }
  return "Arjuna couldn't reply right now. Tap Retry in a moment.";
}

/** PDF-specific extraction message. */
export function friendlyPdfExtractError(): string {
  return "PDF was hard to read — we tried converting pages. Fix tasks below or take a photo of each page.";
}

/** Homework extraction when Gemini is not configured. */
export function missingGeminiExtractResponse() {
  return NextResponse.json({
    tasks: [],
    confidence: "low",
    error: "missing_api_key",
  });
}

/** Generic Gemini-backed route when key is missing. */
export function missingGeminiResponse() {
  return NextResponse.json({ error: "missing_api_key" }, { status: 503 });
}

/** Sarvam voice routes when key is missing. */
export function missingSarvamResponse() {
  return NextResponse.json({ error: "missing_api_key" }, { status: 503 });
}
