import { NextRequest, NextResponse } from "next/server";
import { getFamilyInviteMeta, setupFamily } from "@/lib/familyStore";
import { getInviteByCode } from "@/lib/invitesStore";

type RouteContext = { params: { code: string } };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const invite = await getInviteByCode(params.code);
  if (!invite) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    childName?: string;
    grade?: string;
    board?: "CBSE" | "ICSE" | "IB" | "State";
  };

  const childName = body.childName?.trim() ?? "";
  if (!childName) {
    return NextResponse.json({ error: "child_name_required" }, { status: 400 });
  }

  const meta = await getFamilyInviteMeta(params.code);
  if (meta?.setupComplete) {
    return NextResponse.json({ error: "already_setup" }, { status: 409 });
  }

  const result = await setupFamily(params.code, {
    childName,
    grade: body.grade?.trim() || undefined,
    board: body.board,
  });

  if (!result.ok) {
    const status =
      result.error === "already_setup"
        ? 409
        : result.error === "database_unavailable"
          ? 503
          : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    child: result.child,
  });
}
