import { NextRequest, NextResponse } from "next/server";
import { requireInvite } from "@/lib/apiAuth";
import { generateExamQuiz } from "@/lib/gemini";
import { resolveGeminiKey } from "@/lib/resolveApiKey";
import { missingGeminiResponse } from "@/lib/userErrors";
import { getExamById } from "@/lib/examStore";
import { getOrCreate } from "@/lib/memory";
import { normalizeTopicKey } from "@/lib/childProfile";
import type { ExamQuizQuestion } from "@/lib/examTypes";
import type { LanguageMode } from "@/lib/settings";
import type { CurriculumBoard } from "@/lib/childProfile";

export async function POST(request: NextRequest) {
  const denied = await requireInvite(request);
  if (denied) return denied;

  const body = (await request.json()) as {
    examId?: string;
    languageMode?: LanguageMode;
    /** questionId -> chosen option index. Present when the child submits. */
    answers?: Record<string, number>;
    schoolKey?: string;
  };

  const apiKey = resolveGeminiKey(request);
  if (!apiKey) {
    return missingGeminiResponse();
  }

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
    let quiz: { questions: ExamQuizQuestion[]; missionTitle?: string };
    let cached = false;

    if (body.schoolKey) {
      const topicKey = normalizeTopicKey([
        exam.subject,
        "quiz",
        exam.id,
        languageMode,
      ]);

      const result = await getOrCreate<{ questions: ExamQuizQuestion[]; missionTitle?: string }>({
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

    // Grading happens here, never in the browser: the child learns whether an
    // answer was right without `correctIndex` ever leaving the server. A wrong
    // answer returns no correct option — that would just hand over the answer.
    if (body.answers) {
      const results: Record<string, boolean> = {};
      for (const q of quiz.questions) {
        const chosen = body.answers[q.id];
        if (typeof chosen === "number") {
          results[q.id] = chosen === q.correctIndex;
        }
      }
      return NextResponse.json({
        results,
        score: Object.values(results).filter(Boolean).length,
        total: Object.keys(results).length,
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

    return NextResponse.json({ questions, missionTitle: quiz.missionTitle, cached });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Quiz failed";
    return NextResponse.json({ error: "quiz_failed", message }, { status: 502 });
  }
}
