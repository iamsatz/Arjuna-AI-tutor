import { NextRequest, NextResponse } from "next/server";
import { generateExamRevision } from "@/lib/gemini";
import { getExamById } from "@/lib/examStore";
import type { ChatMessage } from "@/lib/types";
import type { LanguageMode } from "@/lib/settings";
import type { CurriculumBoard } from "@/lib/childProfile";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "missing_api_key", message: "Add GEMINI_API_KEY to .env.local" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    examId?: string;
    childName?: string;
    messages?: ChatMessage[];
    contextNote?: string;
    languageMode?: LanguageMode;
  };

  if (!body.examId || !body.childName) {
    return NextResponse.json(
      { error: "examId and childName required" },
      { status: 400 },
    );
  }

  const exam = await getExamById(body.examId);
  if (!exam) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!exam.concept_notes) {
    return NextResponse.json(
      { error: "no_concepts", message: "Upload study pages first" },
      { status: 400 },
    );
  }

  try {
    const reply = await generateExamRevision(
      apiKey,
      (exam.board as CurriculumBoard | null) ?? undefined,
      exam.grade ?? undefined,
      exam.subject,
      exam.concept_notes,
      body.languageMode ?? "mixed",
      body.messages ?? [],
      body.childName,
      body.contextNote,
    );

    return NextResponse.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Revision failed";
    return NextResponse.json({ error: "revision_failed", message }, { status: 502 });
  }
}
