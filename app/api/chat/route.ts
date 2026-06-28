import { NextRequest, NextResponse } from "next/server";
import { chatWithArjuna } from "@/lib/gemini";
import type { ChatMessage } from "@/lib/types";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "missing_api_key", message: "Add GEMINI_API_KEY to .env.local" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    messages: ChatMessage[];
    contextNote?: string;
    childName?: string;
    grade?: string;
    board?: "CBSE" | "ICSE" | "IB" | "State";
    languageMode?: "english" | "pure_telugu" | "mixed";
  };

  if (!body.messages?.length) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
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
    );
    return NextResponse.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat failed";
    return NextResponse.json({ error: "chat_failed", message }, { status: 502 });
  }
}
