import { NextRequest, NextResponse } from "next/server";
import {
  extractHomeworkFromPhoto,
  extractHomeworkFromText,
} from "@/lib/gemini";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "missing_api_key", message: "Add GEMINI_API_KEY to .env.local" },
      { status: 503 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const photo = form.get("photo");
      if (!(photo instanceof File)) {
        return NextResponse.json({ error: "photo required" }, { status: 400 });
      }
      const buffer = Buffer.from(await photo.arrayBuffer());
      const result = await extractHomeworkFromPhoto(
        apiKey,
        buffer.toString("base64"),
        photo.type || "image/jpeg",
      );
      return NextResponse.json(result);
    }

    const body = (await request.json()) as { text?: string };
    if (!body.text?.trim()) {
      return NextResponse.json({ error: "text required" }, { status: 400 });
    }

    const result = await extractHomeworkFromText(apiKey, body.text.trim());
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Extract failed";
    return NextResponse.json({ error: "extract_failed", message }, { status: 502 });
  }
}
