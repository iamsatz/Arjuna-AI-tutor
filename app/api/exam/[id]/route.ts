import { NextRequest, NextResponse } from "next/server";
import { getExamById } from "@/lib/examStore";

type RouteContext = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const exam = await getExamById(params.id);
  if (!exam) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ exam });
}
