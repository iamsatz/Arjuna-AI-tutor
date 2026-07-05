import { NextRequest, NextResponse } from "next/server";
import { verifyAnswerFromPhoto } from "@/lib/gemini";
import { missingGeminiExtractResponse } from "@/lib/userErrors";
import { geminiKeyFromValue, resolveGeminiKey } from "@/lib/resolveApiKey";
import type { LanguageMode } from "@/lib/settings";

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const apiKey = resolveGeminiKey(request);
      if (!apiKey) {
        return missingGeminiExtractResponse();
      }
      const form = await request.formData();
      const photo = form.get("photo");
      const subject = String(form.get("subject") ?? "").trim();
      const task = String(form.get("task") ?? "").trim();
      const grade = String(form.get("grade") ?? "").trim() || undefined;
      const languageMode = (String(form.get("languageMode") ?? "mixed") ||
        "mixed") as LanguageMode;

      if (!(photo instanceof File) || !subject || !task) {
        return NextResponse.json(
          { error: "photo, subject, and task required" },
          { status: 400 },
        );
      }

      const buffer = Buffer.from(await photo.arrayBuffer());
      const result = await verifyAnswerFromPhoto(
        apiKey,
        {
          data: buffer.toString("base64"),
          mimeType: photo.type || "image/jpeg",
        },
        subject,
        task,
        languageMode,
        grade,
      );

      return NextResponse.json(result);
    }

    const body = (await request.json()) as {
      imageBase64?: string;
      mimeType?: string;
      subject?: string;
      task?: string;
      grade?: string;
      languageMode?: LanguageMode;
      geminiApiKey?: string;
    };

    const apiKey =
      geminiKeyFromValue(body.geminiApiKey) ?? resolveGeminiKey(request);
    if (!apiKey) {
      return missingGeminiExtractResponse();
    }

    if (!body.imageBase64 || !body.subject?.trim() || !body.task?.trim()) {
      return NextResponse.json(
        { error: "imageBase64, subject, and task required" },
        { status: 400 },
      );
    }

    const result = await verifyAnswerFromPhoto(
      apiKey,
      {
        data: body.imageBase64,
        mimeType: body.mimeType || "image/jpeg",
      },
      body.subject.trim(),
      body.task.trim(),
      body.languageMode ?? "mixed",
      body.grade?.trim(),
    );

    return NextResponse.json(result);
  } catch (e) {
    console.error("verify-answer", e);
    return NextResponse.json(
      {
        correct: false,
        feedback: "Could not read your work. Try a clearer photo.",
        hint: "Make sure the full answer is visible and well lit.",
      },
      { status: 200 },
    );
  }
}
