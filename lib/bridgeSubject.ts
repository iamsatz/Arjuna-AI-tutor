import {
  bridgeSubjectFor,
  type MediumOfInstruction,
} from "@/lib/childProfile";

export type SpeechSegment = {
  languageCode: string;
  text: string;
};

const SEGMENT_RE = /\[\[(hi-IN|en-IN|te-IN)\]\]([\s\S]*?)\[\[\/\]\]/g;

export function isBridgeSubject(
  subject: string | undefined,
  medium: MediumOfInstruction | undefined,
): boolean {
  if (!subject?.trim()) return false;
  const bridge = bridgeSubjectFor(medium);
  return subject.trim().toLowerCase() === bridge.toLowerCase();
}

export function bridgeSpeechLanguage(
  medium: MediumOfInstruction | undefined,
): "hi-IN" | "en-IN" {
  return medium === "telugu_medium" ? "en-IN" : "hi-IN";
}

/** Split tagged reply into ordered TTS segments; plain text uses defaultLang. */
export function parseSpeechSegments(
  text: string,
  defaultLang: string,
): SpeechSegment[] {
  const segments: SpeechSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  SEGMENT_RE.lastIndex = 0;
  while ((match = SEGMENT_RE.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index).trim();
    if (before) {
      segments.push({ languageCode: defaultLang, text: before });
    }
    const tagged = match[2].trim();
    if (tagged) {
      segments.push({ languageCode: match[1], text: tagged });
    }
    lastIndex = match.index + match[0].length;
  }

  const tail = text.slice(lastIndex).trim();
  if (tail) {
    segments.push({ languageCode: defaultLang, text: tail });
  }

  if (!segments.length && text.trim()) {
    segments.push({ languageCode: defaultLang, text: text.trim() });
  }

  return segments;
}

/** Remove TTS markers for on-screen display. */
export function stripSpeechMarkers(text: string): string {
  return text.replace(SEGMENT_RE, (_m, _lang, inner: string) => inner);
}

export function defaultSpeechLanguage(languageMode: string): string {
  if (languageMode === "pure_telugu" || languageMode === "mixed") return "te-IN";
  return "en-IN";
}
