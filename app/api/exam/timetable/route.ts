import { NextRequest, NextResponse } from "next/server";
import { extractExamTimetable, extractExamTimetableFromText } from "@/lib/gemini";
import { geminiKeyFromValue, resolveGeminiKey } from "@/lib/resolveApiKey";
import { missingGeminiResponse } from "@/lib/userErrors";
import { createExam } from "@/lib/examStore";
import type { CurriculumBoard } from "@/lib/childProfile";

async function saveExams(
  exams: { subject: string; examDate?: string; topics: string[] }[],
  confidence: string,
  info: { inviteCode: string; childName: string; board?: CurriculumBoard; grade?: string },
) {
  if (!exams.length) {
    return NextResponse.json({ error: "no_exams_found", confidence }, { status: 422 });
  }
  const created = [];
  for (const row of exams) {
    const exam = await createExam({
      inviteCode: info.inviteCode,
      childName: info.childName,
      subject: row.subject,
      board: info.board,
      grade: info.grade,
      examDate: row.examDate,
      topics: row.topics,
      status: "draft",
    });
    if (exam) created.push(exam);
  }
  return NextResponse.json({ exams: created, confidence });
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const apiKey = resolveGeminiKey(request);
      if (!apiKey) return missingGeminiResponse();

      const form = await request.formData();
      const photos = form.getAll("photo").filter((p): p is File => p instanceof File);
      const inviteCode = form.get("inviteCode")?.toString();
      const childName = form.get("childName")?.toString();
      const board = form.get("board")?.toString() as CurriculumBoard | undefined;
      const grade = form.get("grade")?.toString();
      const extraText = form.get("text")?.toString();

      if (!photos.length || !inviteCode || !childName) {
        return NextResponse.json(
          { error: "photo, inviteCode, childName required" },
          { status: 400 },
        );
      }

      const images = await Promise.all(
        photos.map(async (photo) => ({
          base64: Buffer.from(await photo.arrayBuffer()).toString("base64"),
          mimeType: photo.type || "image/jpeg",
        })),
      );

      const extracted = await extractExamTimetable(apiKey, images, extraText);
      return saveExams(extracted.exams, extracted.confidence, {
        inviteCode,
        childName,
        board,
        grade,
      });
    }

    const body = (await request.json()) as {
      text?: string;
      inviteCode?: string;
      childName?: string;
      board?: CurriculumBoard;
      grade?: string;
      geminiApiKey?: string;
    };

    const apiKey = geminiKeyFromValue(body.geminiApiKey) ?? resolveGeminiKey(request);
    if (!apiKey) return missingGeminiResponse();

    if (!body.text?.trim() || !body.inviteCode || !body.childName) {
      return NextResponse.json(
        { error: "text, inviteCode, childName required" },
        { status: 400 },
      );
    }

    const extracted = await extractExamTimetableFromText(apiKey, body.text.trim());
    return saveExams(extracted.exams, extracted.confidence, {
      inviteCode: body.inviteCode,
      childName: body.childName,
      board: body.board,
      grade: body.grade,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Timetable failed";
    return NextResponse.json({ error: "timetable_failed", message }, { status: 502 });
  }
}
