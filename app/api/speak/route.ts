import { NextRequest, NextResponse } from "next/server";
import { synthesizeSpeech, ARJUNA_GREETING } from "@/lib/sarvam";

export async function GET() {
  return handleSpeak(ARJUNA_GREETING);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    text?: string;
    speaker?: string;
  };
  return handleSpeak(body.text ?? ARJUNA_GREETING, body.speaker);
}

async function handleSpeak(text: string, speaker?: string) {
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
