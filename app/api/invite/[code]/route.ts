import { NextRequest, NextResponse } from "next/server";
import { claimInvite, getInviteByCode } from "@/lib/invitesStore";

type RouteContext = { params: { code: string } };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const invite = await getInviteByCode(params.code);

  if (!invite) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    invite: {
      code: invite.code,
      label: invite.label,
      childName: invite.childName,
      grade: invite.grade,
      board: invite.board,
      claimed: Boolean(invite.childName),
    },
  });
}

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

  const childName = body.childName?.trim();
  if (!childName) {
    return NextResponse.json({ error: "child_name_required" }, { status: 400 });
  }

  const updated = await claimInvite(
    params.code,
    childName,
    body.grade,
    body.board,
  );
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    invite: {
      code: updated.code,
      childName: updated.childName,
      grade: updated.grade,
      board: updated.board,
      claimed: true,
    },
  });
}
