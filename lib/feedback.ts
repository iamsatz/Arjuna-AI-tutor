const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const FEEDBACK_PROMPT = `You analyze parent feedback about an AI homework tutor session for a young child (Class 1-3).
Return JSON only, no markdown:
{
  "summary": "2-3 sentence digest for the product owner",
  "sentiment": "positive|mixed|negative",
  "tags": ["voice","spelling","patience","screen-time","engagement","other"],
  "action_items": ["concrete next steps for the builder"],
  "priority": "low|medium|high"
}`;

export type FeedbackAnalysis = {
  summary: string;
  sentiment: "positive" | "mixed" | "negative";
  tags: string[];
  action_items: string[];
  priority: "low" | "medium" | "high";
};

export async function analyzeParentFeedback(
  apiKey: string,
  rawText: string,
  context?: { childName?: string; submittedBy?: string },
): Promise<FeedbackAnalysis> {
  const contextLine = [
    context?.submittedBy ? `From: ${context.submittedBy}` : "",
    context?.childName ? `Child: ${context.childName}` : "",
  ]
    .filter(Boolean)
    .join(". ");

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${FEEDBACK_PROMPT}\n\n${contextLine ? `${contextLine}\n\n` : ""}Parent note:\n${rawText}`,
            },
          ],
        },
      ],
      generationConfig: { maxOutputTokens: 512, temperature: 0.4 },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini feedback analysis failed (${response.status}): ${detail}`);
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Empty feedback analysis");

  const cleaned = text.replace(/```json\n?|```/g, "").trim();
  const parsed = JSON.parse(cleaned) as Partial<FeedbackAnalysis>;

  return {
    summary: parsed.summary?.trim() || rawText.slice(0, 200),
    sentiment: parsed.sentiment ?? "mixed",
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    action_items: Array.isArray(parsed.action_items) ? parsed.action_items : [],
    priority: parsed.priority ?? "medium",
  };
}
