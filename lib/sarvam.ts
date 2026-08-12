import type { LanguageMode } from "@/lib/settings";

const SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech";
const SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text";

export const DEFAULT_LANGUAGE_MODE: LanguageMode = "mixed";

export const GREETINGS: Record<LanguageMode, string> = {
  pure_telugu:
    "హాయ్! ఈ రోజు ఏం హోంవర్క్ ఉంది? ఫోటో అప్‌లోడ్ చేయి, లేదా నాకు చెప్పు.",
  mixed: "Hi! ఈ రోజు ఏం homework ఉంది? Photo upload చేయి, లేదా నాకు చెప్పు.",
  english:
    "Hi! What homework do you have? Please upload or tell me the homework.",
};

export function normalizeLanguageMode(value?: string | null): LanguageMode {
  return value && value in GREETINGS
    ? (value as LanguageMode)
    : DEFAULT_LANGUAGE_MODE;
}

export function greetingFor(languageMode?: string): string {
  return GREETINGS[normalizeLanguageMode(languageMode)];
}

export type SttMode = "transcribe" | "codemix";

/**
 * saaras:v3 settings per language mode. Mixed mode uses `codemix` so English
 * words come back in English and Telugu in Telugu script, and `unknown` so
 * Sarvam detects rather than being forced onto one side of the mix.
 */
export const STT_LANGUAGE_SETTINGS: Record<
  LanguageMode,
  { languageCode: string; mode: SttMode }
> = {
  pure_telugu: { languageCode: "te-IN", mode: "transcribe" },
  mixed: { languageCode: "unknown", mode: "codemix" },
  english: { languageCode: "en-IN", mode: "transcribe" },
};

export function sttSettingsFor(languageMode?: string): {
  languageCode: string;
  mode: SttMode;
} {
  return STT_LANGUAGE_SETTINGS[normalizeLanguageMode(languageMode)];
}

export const SARVAM_SPEAKERS = ["shubh", "priya", "ritu"] as const;
export type SarvamSpeaker = (typeof SARVAM_SPEAKERS)[number];

export type SarvamSpeakOptions = {
  text?: string;
  languageCode?: string;
  speaker?: string;
  pace?: number;
};

export async function synthesizeSpeech(
  apiKey: string,
  options: SarvamSpeakOptions = {},
): Promise<{ audioBase64: string; mimeType: string }> {
  const {
    text = greetingFor(),
    languageCode = "te-IN",
    speaker = "shubh",
    pace = 0.95,
  } = options;

  const response = await fetch(SARVAM_TTS_URL, {
    method: "POST",
    headers: {
      "api-subscription-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      target_language_code: languageCode,
      model: "bulbul:v3",
      speaker,
      pace,
      output_audio_codec: "mp3",
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Sarvam TTS failed (${response.status}): ${detail}`);
  }

  const data = (await response.json()) as { audios?: string[] };
  const audioBase64 = data.audios?.[0];

  if (!audioBase64) {
    throw new Error("Sarvam TTS returned no audio");
  }

  return { audioBase64, mimeType: "audio/mpeg" };
}

export type TranscribeOptions = {
  languageMode?: string;
  filename?: string;
};

export async function transcribeSpeech(
  apiKey: string,
  audioBuffer: Buffer,
  options: TranscribeOptions = {},
): Promise<string> {
  const { languageMode, filename = "audio.webm" } = options;
  const { languageCode, mode } = sttSettingsFor(languageMode);

  const form = new FormData();
  const bytes = new Uint8Array(audioBuffer);
  const file = new File([bytes], filename, { type: "audio/webm" });
  form.append("file", file);
  form.append("model", "saaras:v3");
  form.append("language_code", languageCode);
  form.append("mode", mode);

  const response = await fetch(SARVAM_STT_URL, {
    method: "POST",
    headers: { "api-subscription-key": apiKey },
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Sarvam STT failed (${response.status}): ${detail}`);
  }

  const data = (await response.json()) as { transcript?: string; text?: string };
  const text = (data.transcript ?? data.text ?? "").trim();
  if (!text) throw new Error("Sarvam STT returned empty transcript");
  return text;
}
