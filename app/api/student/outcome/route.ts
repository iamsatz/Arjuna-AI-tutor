import { NextRequest, NextResponse } from "next/server";
import { recordOutcome, type OutcomeResult } from "@/lib/studentAgent";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    studentKey?: string;
    inviteCode?: string;
    childName?: string;
    schoolKey?: string;
    subject?: string;
    topic?: string;
    result?: OutcomeResult;
    note?: string;
  };

  if (!body.studentKey || !body.topic || !body.result) {
    return NextResponse.json(
      { error: "studentKey, topic and result required" },
      { status: 400 },
    );
  }

  try {
    const memory = await recordOutcome({
      studentKey: body.studentKey,
      inviteCode: body.inviteCode,
      childName: body.childName,
      schoolKey: body.schoolKey,
      subject: body.subject,
      topic: body.topic,
      result: body.result,
      note: body.note,
    });
    return NextResponse.json({ ok: true, profile: memory.profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "outcome failed";
    return NextResponse.json({ error: "outcome_failed", message }, { status: 502 });
  }
}
