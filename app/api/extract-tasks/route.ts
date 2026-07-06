import { NextRequest, NextResponse } from "next/server";
import {
  extractHomeworkFromPhotos,
  extractHomeworkFromText,
} from "@/lib/gemini";
import { cacheDiaryTermPlan } from "@/lib/diaryTermPlan";
import { buildSchoolKey, type CurriculumBoard } from "@/lib/childProfile";
import { geminiKeyFromValue, resolveGeminiKey } from "@/lib/resolveApiKey";
import { missingGeminiExtractResponse } from "@/lib/userErrors";

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const apiKey = resolveGeminiKey(request);
      if (!apiKey) {
        return missingGeminiExtractResponse();
      }

      const form = await request.formData();
      const photos = form.getAll("photo").filter((p): p is File => p instanceof File);
      const diaryNote = String(form.get("diaryNote") ?? "").trim() || undefined;
      const text = String(form.get("text") ?? "").trim() || undefined;
      const schoolName = String(form.get("schoolName") ?? "").trim() || undefined;
      const grade = String(form.get("grade") ?? "").trim() || undefined;
      const boardRaw = String(form.get("board") ?? "").trim();
      const board = (boardRaw || undefined) as CurriculumBoard | undefined;

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

        if (
          result.termPlan?.subjects?.length &&
          schoolName &&
          grade
        ) {
          const schoolKey = buildSchoolKey(schoolName, grade, board);
          if (schoolKey) {
            await cacheDiaryTermPlan({
              schoolKey,
              schoolName,
              grade,
              board,
              termPlan: result.termPlan,
            });
          }
        }

        return NextResponse.json(result);
      }

      const combined = [diaryNote, text].filter(Boolean).join("\n\n");
      const result = await extractHomeworkFromText(apiKey, combined, diaryNote);
      return NextResponse.json(result);
    }

    const body = (await request.json()) as {
      text?: string;
      diaryNote?: string;
      geminiApiKey?: string;
      schoolName?: string;
      grade?: string;
      board?: CurriculumBoard;
    };

    const apiKey =
      geminiKeyFromValue(body.geminiApiKey) ?? resolveGeminiKey(request);
    if (!apiKey) {
      return missingGeminiExtractResponse();
    }

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
    const authFailed =
      message.includes("401") ||
      message.toLowerCase().includes("unauthenticated") ||
      message.toLowerCase().includes("invalid authentication");
    return NextResponse.json({
      tasks: [],
      confidence: "low",
      reason: "extract_failed",
      error: authFailed ? "google_rejected" : message,
    });
  }
}
