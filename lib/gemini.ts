import {
  ARJUNA_SYSTEM_PROMPT,
  PHOTO_EXTRACTION_PROMPT,
  SUMMARY_PROMPT,
} from "./prompts";
import type { ChatMessage, HomeworkTask } from "./types";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

type GeminiPart = { text?: string; inline_data?: { mime_type: string; data: string } };

async function geminiGenerate(
  apiKey: string,
  parts: GeminiPart[],
  systemInstruction?: string,
): Promise<string> {
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      maxOutputTokens: 256,
      temperature: 0.7,
    },
  };

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini failed (${response.status}): ${detail}`);
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}

function parseJson<T>(raw: string): T {
  const cleaned = raw.replace(/```json\n?|```/g, "").trim();
  return JSON.parse(cleaned) as T;
}

export async function chatWithArjuna(
  apiKey: string,
  messages: ChatMessage[],
  contextNote?: string,
): Promise<string> {
  const history = messages
    .map((m) => `${m.role === "user" ? "Aadya" : "Arjuna"}: ${m.content}`)
    .join("\n");

  const prompt = contextNote
    ? `${contextNote}\n\nConversation so far:\n${history}\n\nArjuna's next reply (short, under 12 words where possible):`
    : `Conversation so far:\n${history}\n\nArjuna's next reply (short, under 12 words where possible):`;

  return geminiGenerate(apiKey, [{ text: prompt }], ARJUNA_SYSTEM_PROMPT);
}

export async function extractHomeworkFromPhoto(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
): Promise<{ tasks: HomeworkTask[]; confidence: string; reason?: string }> {
  const raw = await geminiGenerate(
    apiKey,
    [
      { text: PHOTO_EXTRACTION_PROMPT },
      { inline_data: { mime_type: mimeType, data: imageBase64 } },
    ],
  );

  return parseJson(raw);
}

export async function generateSessionSummary(
  apiKey: string,
  transcript: string,
): Promise<{ telugu_summary: string; english_summary: string; flags: string[] }> {
  const raw = await geminiGenerate(
    apiKey,
    [{ text: `${SUMMARY_PROMPT}\n\nTranscript:\n${transcript}` }],
  );

  const parsed = parseJson<{
    telugu_summary: string;
    english_summary: string;
    flags?: string[];
  }>(raw);

  return {
    telugu_summary: parsed.telugu_summary,
    english_summary: parsed.english_summary,
    flags: parsed.flags ?? [],
  };
}
