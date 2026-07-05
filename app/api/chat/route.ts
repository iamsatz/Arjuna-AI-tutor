import { NextRequest, NextResponse } from "next/server";
import { chatWithArjuna } from "@/lib/gemini";
import { missingGeminiResponse } from "@/lib/userErrors";
import { getTeachingPlan, teachingPlanToNotes } from "@/lib/schoolAgent";
import { buildStudentNotes, getStudentMemory } from "@/lib/studentAgent";
import { buildBridgeSubjectRules } from "@/lib/prompts";
import { geminiKeyFromValue, resolveGeminiKey } from "@/lib/resolveApiKey";
import { normalizeTeachingMethod } from "@/lib/teachingMethods";
import type { ChatMessage } from "@/lib/types";
import type {
  CurriculumBoard,
  MediumOfInstruction,
  TeachingMethod,
} from "@/lib/childProfile";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    messages: ChatMessage[];
    contextNote?: string;
    childName?: string;
    grade?: string;
    board?: CurriculumBoard;
    method?: TeachingMethod;
    medium?: MediumOfInstruction;
    languageMode?: "english" | "pure_telugu" | "mixed";
    studentKey?: string;
    scopeKey?: string;
    subject?: string;
    topic?: string;
    geminiApiKey?: string;
  };

  const apiKey =
    geminiKeyFromValue(body.geminiApiKey) ?? resolveGeminiKey(request);
  if (!apiKey) {
    return missingGeminiResponse();
  }

  if (!body.messages?.length) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  const teachingNotes: string[] = [];
  const bridgeRules = buildBridgeSubjectRules(body.subject, body.medium);

  if (body.scopeKey && body.subject && body.topic) {
    try {
      const { plan } = await getTeachingPlan({
        apiKey,
        scopeKey: body.scopeKey,
        subject: body.subject,
        topic: body.topic,
        board: body.board,
        method: body.method,
        grade: body.grade,
        medium: body.medium,
      });
      const notes = teachingPlanToNotes(plan);
      if (notes) teachingNotes.push(notes);
    } catch {
      // Plan is best-effort; fall back to plain teaching.
    }
  }

  if (body.studentKey) {
    try {
      const memory = await getStudentMemory(body.studentKey);
      teachingNotes.push(...buildStudentNotes(memory));
    } catch {
      // ignore
    }
  }

  try {
    const reply = await chatWithArjuna(
      apiKey,
      body.messages,
      body.contextNote,
      body.childName ?? "friend",
      body.languageMode ?? "mixed",
      body.grade,
      body.board,
      teachingNotes.length ? teachingNotes : undefined,
      bridgeRules || undefined,
      normalizeTeachingMethod(body.method),
    );
    return NextResponse.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat failed";
    return NextResponse.json({ error: "chat_failed", message }, { status: 502 });
  }
}
