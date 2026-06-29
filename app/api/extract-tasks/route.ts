import { NextRequest, NextResponse } from "next/server";
import {
  extractHomeworkFromPhotos,
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
      const photos = form.getAll("photo").filter((p): p is File => p instanceof File);
      const diaryNote = String(form.get("diaryNote") ?? "").trim() || undefined;
      const text = String(form.get("text") ?? "").trim() || undefined;

      if (photos.length === 0 && !diaryNote && !text) {
        return NextResponse.json(
          { error: "photo, diaryNote or text required" },
          { status: 400 },
        );
      }

      if (photos.length > 0) {
        const images = await Promise.all(
          photos.map(async (photo) => {
            const buffer = Buffer.from(await photo.arrayBuffer());
            return {
              data: buffer.toString("base64"),
              mimeType: photo.type || "image/jpeg",
            };
          }),
        );
        const result = await extractHomeworkFromPhotos(apiKey, images, {
          diaryNote,
          extraText: text,
        });
        return NextResponse.json(result);
      }

      const combined = [diaryNote, text].filter(Boolean).join("\n\n");
      const result = await extractHomeworkFromText(apiKey, combined, diaryNote);
      return NextResponse.json(result);
    }

    const body = (await request.json()) as {
      text?: string;
      diaryNote?: string;
    };
    const text = body.text?.trim();
    const diaryNote = body.diaryNote?.trim();

    if (!text && !diaryNote) {
      return NextResponse.json({ error: "text required" }, { status: 400 });
    }

    const combined = [diaryNote, text].filter(Boolean).join("\n\n");
    const result = await extractHomeworkFromText(
      apiKey,
      combined,
      diaryNote,
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Extract failed";
    return NextResponse.json({ error: "extract_failed", message }, { status: 502 });
  }
}
