export type TeachIntent = "hint" | "explain" | "try_self" | "explain_again";

export function parseTeachIntent(text: string): TeachIntent | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;

  if (
    /\b(hint|chinna hint)\b/.test(t) ||
    t.includes("hint kav") ||
    t.includes("hint ivv") ||
    t.includes("give me hint") ||
    t.includes("give hint")
  ) {
    return "hint";
  }

  if (
    /\bexplain\b.*\b(fully|full|clearly|properly|again|clear)\b/.test(t) ||
    t.includes("full ga explain") ||
    t.includes("explain chey") ||
    t.includes("explain clearly") ||
    t.includes("explain fully")
  ) {
    return t.includes("again") || t.includes("malli") ? "explain_again" : "explain";
  }

  if (
    /\b(try myself|i'll try|ill try|myself)\b/.test(t) ||
    t.includes("nuvve try") ||
    t.includes("try chesta")
  ) {
    return "try_self";
  }

  if (t.includes("explain again") || t.includes("malli explain")) {
    return "explain_again";
  }

  return null;
}
