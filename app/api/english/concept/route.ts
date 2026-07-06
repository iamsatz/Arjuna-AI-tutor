import { NextRequest, NextResponse } from "next/server";
import {
  checkEnglishConceptPass,
  englishConceptTurn,
} from "@/lib/gemini";
import { missingGeminiResponse } from "@/lib/userErrors";
import { getConceptById } from "@/lib/englishConceptMap";
import { geminiKeyFromValue, resolveGeminiKey } from "@/lib/resolveApiKey";
import { normalizeTeachingMethod } from "@/lib/teachingMethods";
import type { ChatMessage } from "@/lib/types";
import type { CurriculumBoard, TeachingMethod } from "@/lib/childProfile";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    conceptId: string;
    step: string;
    messages?: ChatMessage[];
    childName?: string;
    grade?: string;
    board?: CurriculumBoard;
    method?: TeachingMethod;
    languageMode?: "english" | "pure_telugu" | "mixed";
    checkCompletion?: boolean;
    geminiApiKey?: string;
  };

  const apiKey =
    geminiKeyFromValue(body.geminiApiKey) ?? resolveGeminiKey(request);
  if (!apiKey) return missingGeminiResponse();

  const concept = getConceptById(body.conceptId);
  if (!concept) {
    return NextResponse.json({ error: "unknown concept" }, { status: 400 });
  }

  const messages = body.messages ?? [];
  const languageMode = body.languageMode ?? "mixed";

  try {
    if (body.checkCompletion) {
      const result = await checkEnglishConceptPass(
        apiKey,
        concept.label,
        languageMode,
        messages,
      );
      return NextResponse.json(result);
    }

    const reply = await englishConceptTurn(apiKey, {
      childName: body.childName ?? "friend",
      languageMode,
      grade: body.grade,
      board: body.board,
      method: normalizeTeachingMethod(body.method),
      conceptLabel: concept.label,
      conceptFocus: concept.focus,
      step: body.step,
      messages,
    });

    return NextResponse.json({ reply, concept });
  } catch (error) {
    const message = error instanceof Error ? error.message : "concept failed";
    return NextResponse.json({ error: "concept_failed", message }, { status: 502 });
  }
}
