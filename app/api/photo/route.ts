import { NextRequest, NextResponse } from "next/server";
import { extractHomeworkFromPhoto } from "@/lib/gemini";
import { missingGeminiExtractResponse } from "@/lib/userErrors";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return missingGeminiExtractResponse();
  }

  const form = await request.formData();
  const file = form.get("photo");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "photo required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > 1_000_000) {
    return NextResponse.json({ error: "photo_too_large" }, { status: 413 });
  }

  const mimeType = file.type || "image/jpeg";
  const base64 = buffer.toString("base64");

  try {
    const result = await extractHomeworkFromPhoto(apiKey, base64, mimeType);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Photo read failed";
    return NextResponse.json({
      tasks: [],
      confidence: "low",
      reason: "extract_failed",
      error: message,
    });
  }
}
