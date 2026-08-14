import { NextRequest, NextResponse } from "next/server";
import { generateDailyWords } from "@/lib/gemini";
import { missingGeminiResponse } from "@/lib/userErrors";
import { resolveGeminiKey } from "@/lib/resolveApiKey";
import type { MediumOfInstruction } from "@/lib/childProfile";
import { requireInvite } from "@/lib/apiAuth";

export async function POST(request: NextRequest) {
  const denied = await requireInvite(request);
  if (denied) return denied;
  const body = (await request.json()) as {
    count?: number;
    grade?: string;
    medium?: MediumOfInstruction;
    languageMode?: "english" | "pure_telugu" | "mixed";
    homeworkText?: string;
    curriculumTopics?: string[];
  };

  const apiKey = resolveGeminiKey(request);
  if (!apiKey) return missingGeminiResponse();

  const count = body.count === 10 ? 10 : 5;

  try {
    const words = await generateDailyWords(apiKey, {
      count,
      grade: body.grade,
      medium: body.medium,
      languageMode: body.languageMode ?? "mixed",
      homeworkText: body.homeworkText,
      curriculumTopics: body.curriculumTopics,
    });
    return NextResponse.json({ words });
  } catch (error) {
    const message = error instanceof Error ? error.message : "words failed";
    return NextResponse.json({ error: "words_failed", message }, { status: 502 });
  }
}
