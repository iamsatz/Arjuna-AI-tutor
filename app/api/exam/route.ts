import { NextRequest, NextResponse } from "next/server";
import { createExam, listExamsByInvite } from "@/lib/examStore";
import type { CurriculumBoard } from "@/lib/childProfile";

export async function GET(request: NextRequest) {
  const inviteCode = request.nextUrl.searchParams.get("inviteCode");
  if (!inviteCode) {
    return NextResponse.json({ error: "inviteCode required" }, { status: 400 });
  }

  const exams = await listExamsByInvite(inviteCode);
  return NextResponse.json({ exams });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    inviteCode?: string;
    childName?: string;
    subject?: string;
    board?: CurriculumBoard;
    grade?: string;
    examDate?: string;
    topics?: string[];
  };

  if (!body.inviteCode || !body.childName || !body.subject) {
    return NextResponse.json(
      { error: "inviteCode, childName, subject required" },
      { status: 400 },
    );
  }

  const exam = await createExam({
    inviteCode: body.inviteCode,
    childName: body.childName,
    subject: body.subject,
    board: body.board,
    grade: body.grade,
    examDate: body.examDate,
    topics: body.topics ?? [],
    status: "draft",
  });

  if (!exam) {
    return NextResponse.json({ error: "create_failed" }, { status: 502 });
  }

  return NextResponse.json({ exam });
}
