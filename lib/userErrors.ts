/** Map server/API errors to parent-friendly copy (never show .env.local). */
export function friendlyExtractError(
  error?: string | null,
  message?: string | null,
): string {
  const raw = `${error ?? ""} ${message ?? ""}`.toLowerCase();
  if (raw.includes("missing_api_key") || raw.includes(".env.local")) {
    return "Photo reading isn't set up yet. Add tasks manually for now.";
  }
  if (raw.includes("extract_failed") || raw.includes("gemini failed")) {
    return "Couldn't read the photo clearly — add or fix tasks below.";
  }
  if (message?.trim() && !message.includes(".env.local")) {
    return message.trim();
  }
  if (error?.trim() && !error.includes(".env.local")) {
    return error.trim();
  }
  return "Couldn't read the photo clearly — add or fix tasks below.";
}
