import { NextRequest, NextResponse } from "next/server";
import { transcribeSpeech } from "@/lib/sarvam";
import { missingSarvamResponse } from "@/lib/userErrors";

export async function POST(request: NextRequest) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return missingSarvamResponse();
  }

  const form = await request.formData();
  const file = form.get("audio");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "audio required" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const transcript = await transcribeSpeech(apiKey, buffer);
    return NextResponse.json({ transcript });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Transcription failed";
    return NextResponse.json(
      { error: "transcribe_failed", message },
      { status: 502 },
    );
  }
}
