import { NextRequest, NextResponse } from "next/server";
import {
  synthesizeSpeech,
  greetingFor,
  normalizeLanguageMode,
} from "@/lib/sarvam";
import { missingSarvamResponse } from "@/lib/userErrors";

function ttsLanguage(languageMode: string, languageCode?: string): string {
  if (languageCode) return languageCode;
  if (languageMode === "pure_telugu" || languageMode === "mixed") return "te-IN";
  return "en-IN";
}

export async function GET(request: NextRequest) {
  const languageMode = normalizeLanguageMode(
    request.nextUrl.searchParams.get("languageMode"),
  );
  return handleSpeak(greetingFor(languageMode), undefined, languageMode);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    text?: string;
    speaker?: string;
    languageMode?: string;
    languageCode?: string;
  };
  const languageMode = normalizeLanguageMode(body.languageMode);
  return handleSpeak(
    body.text ?? greetingFor(languageMode),
    body.speaker,
    languageMode,
    body.languageCode,
  );
}

async function handleSpeak(
  text: string,
  speaker: string | undefined,
  languageMode: string,
  languageCode?: string,
) {
  const apiKey = process.env.SARVAM_API_KEY;

  if (!apiKey || apiKey === "your_sarvam_api_key_here") {
    return missingSarvamResponse();
  }

  try {
    const { audioBase64, mimeType } = await synthesizeSpeech(apiKey, {
      text,
      speaker,
      languageCode: ttsLanguage(languageMode, languageCode),
    });
    const audioBuffer = Buffer.from(audioBase64, "base64");

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown TTS error";
    return NextResponse.json({ error: "tts_failed", message }, { status: 502 });
  }
}
