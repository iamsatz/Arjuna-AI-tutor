const SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech";
const SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text";

export const ARJUNA_GREETING =
  "Namaste Aadya! Class 2 homework em undi today?";

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
    text = ARJUNA_GREETING,
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

export async function transcribeSpeech(
  apiKey: string,
  audioBuffer: Buffer,
  filename = "audio.webm",
): Promise<string> {
  const form = new FormData();
  const bytes = new Uint8Array(audioBuffer);
  const file = new File([bytes], filename, { type: "audio/webm" });
  form.append("file", file);
  form.append("model", "saaras:v3");
  form.append("language_code", "te-IN");

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
