import { NextRequest, NextResponse } from "next/server";
import { createExam, listExamsByInvite } from "@/lib/examStore";
import type { CurriculumBoard } from "@/lib/childProfile";

export async function GET(request: NextRequest) {
  const inviteCode = request.nextUrl.searchParams.get("inviteCode");
  if (!inviteCode) {
    return NextResponse.json({ error: "inviteCode required" }, { status: 400 });
  }

  const childName = request.nextUrl.searchParams.get("childName") ?? undefined;
  const profileId = request.nextUrl.searchParams.get("profileId") ?? undefined;
  const exams = await listExamsByInvite(inviteCode, { childName, profileId });
  return NextResponse.json({ exams });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    inviteCode?: string;
    childName?: string;
    profileId?: string;
    subject?: string;
    board?: CurriculumBoard;
    grade?: string;
    examDate?: string;
    topics?: string[];
    conceptNotes?: string;
    status?: "draft" | "ready";
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
    profileId: body.profileId,
    subject: body.subject,
    board: body.board,
    grade: body.grade,
    examDate: body.examDate,
    topics: body.topics ?? [],
    conceptNotes: body.conceptNotes,
    status: body.status ?? "draft",
  });

  if (!exam) {
    return NextResponse.json({ error: "create_failed" }, { status: 502 });
  }

  return NextResponse.json({ exam });
}
