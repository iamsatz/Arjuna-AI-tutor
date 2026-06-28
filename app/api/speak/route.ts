import { NextRequest, NextResponse } from "next/server";
import { synthesizeSpeech, DEFAULT_GREETING } from "@/lib/sarvam";

function ttsLanguage(languageMode?: string): string {
  if (languageMode === "pure_telugu" || languageMode === "mixed") return "te-IN";
  return "en-IN";
}

export async function GET() {
  return handleSpeak(DEFAULT_GREETING);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    text?: string;
    speaker?: string;
    languageMode?: string;
  };
  return handleSpeak(
    body.text ?? DEFAULT_GREETING,
    body.speaker,
    body.languageMode,
  );
}

async function handleSpeak(
  text: string,
  speaker?: string,
  languageMode?: string,
) {
  const apiKey = process.env.SARVAM_API_KEY;

  if (!apiKey || apiKey === "your_sarvam_api_key_here") {
    return NextResponse.json(
      {
        error: "missing_api_key",
        message: "Add SARVAM_API_KEY to .env.local",
      },
      { status: 503 },
    );
  }

  try {
    const { audioBase64, mimeType } = await synthesizeSpeech(apiKey, {
      text,
      speaker,
      languageCode: ttsLanguage(languageMode),
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
