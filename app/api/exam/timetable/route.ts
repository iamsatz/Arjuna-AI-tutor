import { NextRequest, NextResponse } from "next/server";
import { extractExamTimetable } from "@/lib/gemini";
import { createExam } from "@/lib/examStore";
import type { CurriculumBoard } from "@/lib/childProfile";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "missing_api_key", message: "Add GEMINI_API_KEY to .env.local" },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const photo = form.get("photo");
  const inviteCode = form.get("inviteCode")?.toString();
  const childName = form.get("childName")?.toString();
  const board = form.get("board")?.toString() as CurriculumBoard | undefined;
  const grade = form.get("grade")?.toString();

  if (!(photo instanceof File) || !inviteCode || !childName) {
    return NextResponse.json(
      { error: "photo, inviteCode, childName required" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await photo.arrayBuffer());
  const base64 = buffer.toString("base64");
  const mimeType = photo.type || "image/jpeg";

  try {
    const extracted = await extractExamTimetable(apiKey, base64, mimeType);

    if (!extracted.exams.length) {
      return NextResponse.json(
        { error: "no_exams_found", confidence: extracted.confidence },
        { status: 422 },
      );
    }

    const created = [];
    for (const row of extracted.exams) {
      const exam = await createExam({
        inviteCode,
        childName,
        subject: row.subject,
        board,
        grade,
        examDate: row.examDate,
        topics: row.topics,
        status: "draft",
      });
      if (exam) created.push(exam);
    }

    return NextResponse.json({
      exams: created,
      confidence: extracted.confidence,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Timetable failed";
    return NextResponse.json({ error: "timetable_failed", message }, { status: 502 });
  }
}
