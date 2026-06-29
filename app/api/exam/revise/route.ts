import { NextRequest, NextResponse } from "next/server";
import { generateExamRevision } from "@/lib/gemini";
import { missingGeminiResponse } from "@/lib/userErrors";
import { getExamById } from "@/lib/examStore";
import { getOrCreate } from "@/lib/memory";
import { buildStudentNotes, getStudentMemory } from "@/lib/studentAgent";
import { normalizeTopicKey } from "@/lib/childProfile";
import type { ChatMessage } from "@/lib/types";
import type { LanguageMode } from "@/lib/settings";
import type { CurriculumBoard } from "@/lib/childProfile";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return missingGeminiResponse();
  }

  const body = (await request.json()) as {
    examId?: string;
    childName?: string;
    messages?: ChatMessage[];
    contextNote?: string;
    languageMode?: LanguageMode;
    schoolKey?: string;
    studentKey?: string;
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
      { error: "no_concepts", message: "Upload study pages or pick from curriculum first" },
      { status: 400 },
    );
  }

  const messages = body.messages ?? [];
  const isInitialTurn = messages.length === 0 && !body.contextNote;
  const board = (exam.board as CurriculumBoard | null) ?? undefined;
  const languageMode = body.languageMode ?? "mixed";

  try {
    if (isInitialTurn && body.schoolKey) {
      const topicKey = normalizeTopicKey([
        exam.subject,
        "revision",
        exam.id,
        languageMode,
      ]);

      const { value, cached } = await getOrCreate<{ reply: string }>({
        schoolKey: body.schoolKey,
        kind: "explanation",
        topicKey,
        generate: async () => {
          const reply = await generateExamRevision(
            apiKey,
            board,
            exam.grade ?? undefined,
            exam.subject,
            exam.concept_notes!,
            languageMode,
            [],
            body.childName!,
          );
          return { reply };
        },
      });

      return NextResponse.json({ reply: value.reply, cached });
    }

    // Continue turns are not cached, so personalize with student memory here.
    let contextNote = body.contextNote;
    if (body.studentKey) {
      try {
        const memory = await getStudentMemory(body.studentKey);
        const notes = buildStudentNotes(memory);
        if (notes.length) {
          contextNote = `Teaching notes about this child: ${notes.join(" ")}\n${contextNote ?? ""}`.trim();
        }
      } catch {
        // ignore
      }
    }

    const reply = await generateExamRevision(
      apiKey,
      board,
      exam.grade ?? undefined,
      exam.subject,
      exam.concept_notes,
      languageMode,
      messages,
      body.childName,
      contextNote,
    );

    return NextResponse.json({ reply, cached: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Revision failed";
    return NextResponse.json({ error: "revision_failed", message }, { status: 502 });
  }
}
