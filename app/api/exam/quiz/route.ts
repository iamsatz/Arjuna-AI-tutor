import { NextRequest, NextResponse } from "next/server";
import { generateExamQuiz } from "@/lib/gemini";
import { getExamById } from "@/lib/examStore";
import { getOrCreate } from "@/lib/memory";
import { normalizeTopicKey } from "@/lib/childProfile";
import type { ExamQuizQuestion } from "@/lib/examTypes";
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
    languageMode?: LanguageMode;
    revealAnswers?: boolean;
    pin?: string;
    schoolKey?: string;
  };

  if (!body.examId) {
    return NextResponse.json({ error: "examId required" }, { status: 400 });
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

  const board = (exam.board as CurriculumBoard | null) ?? undefined;
  const languageMode = body.languageMode ?? "mixed";

  try {
    let quiz: { questions: ExamQuizQuestion[] };
    let cached = false;

    if (body.schoolKey) {
      const topicKey = normalizeTopicKey([
        exam.subject,
        "quiz",
        exam.id,
        languageMode,
      ]);

      const result = await getOrCreate<{ questions: ExamQuizQuestion[] }>({
        schoolKey: body.schoolKey,
        kind: "quiz",
        topicKey,
        generate: async () =>
          generateExamQuiz(
            apiKey,
            board,
            exam.grade ?? undefined,
            exam.subject,
            exam.concept_notes!,
            languageMode,
          ),
      });
      quiz = result.value;
      cached = result.cached;
    } else {
      quiz = await generateExamQuiz(
        apiKey,
        board,
        exam.grade ?? undefined,
        exam.subject,
        exam.concept_notes,
        languageMode,
      );
    }

    if (body.revealAnswers) {
      if (!body.pin || body.pin.length < 4) {
        return NextResponse.json({ error: "pin required" }, { status: 401 });
      }
      return NextResponse.json({
        questions: quiz.questions,
        answersRevealed: true,
        cached,
      });
    }

    const questions = quiz.questions.map((q) => ({
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      options: q.options,
      concept: q.concept,
    }));

    return NextResponse.json({ questions, cached });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Quiz failed";
    return NextResponse.json({ error: "quiz_failed", message }, { status: 502 });
  }
}
