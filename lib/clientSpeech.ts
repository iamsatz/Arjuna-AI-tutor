import {
  defaultSpeechLanguage,
  parseSpeechSegments,
  type SpeechSegment,
} from "@/lib/bridgeSubject";

type PlaySpeechOptions = {
  speaker?: string;
  languageMode?: string;
};

async function fetchSpeechAudio(
  segment: SpeechSegment,
  options: PlaySpeechOptions,
): Promise<Blob> {
  const response = await fetch("/api/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: segment.text,
      languageCode: segment.languageCode,
      speaker: options.speaker ?? "shubh",
      languageMode: options.languageMode,
    }),
  });
  if (!response.ok) throw new Error("speak failed");
  return response.blob();
}

function playBlob(blob: Blob): Promise<void> {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  return new Promise<void>((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("audio error"));
    };
    void audio.play();
  });
}

/** Play reply text; supports [[hi-IN]]...[[/]] / [[en-IN]]...[[/]] multi-language segments. */
export async function playSpeech(
  text: string,
  options: PlaySpeechOptions = {},
): Promise<void> {
  const defaultLang = defaultSpeechLanguage(options.languageMode ?? "mixed");
  const segments = parseSpeechSegments(text, defaultLang);

  for (const segment of segments) {
    const blob = await fetchSpeechAudio(segment, options);
    await playBlob(blob);
  }
}
