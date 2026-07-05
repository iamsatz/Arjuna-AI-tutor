import { NextRequest, NextResponse } from "next/server";
import { getFamilyInviteMeta } from "@/lib/familyStore";
import { getInviteByCode } from "@/lib/invitesStore";

type RouteContext = { params: { code: string } };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const invite = await getInviteByCode(params.code);

  if (!invite) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const meta = await getFamilyInviteMeta(params.code);

  return NextResponse.json({
    invite: {
      code: invite.code,
      label: invite.label ?? meta?.label,
      setupComplete: meta?.setupComplete ?? Boolean(invite.childName),
      children: (meta?.children ?? []).map((c) => ({
        id: c.id,
        childName: c.childName,
        grade: c.grade,
        board: c.board,
      })),
      // Legacy field for older clients
      childName: invite.childName,
      grade: invite.grade,
      board: invite.board,
      claimed: meta?.setupComplete ?? Boolean(invite.childName),
    },
  });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const invite = await getInviteByCode(params.code);

  if (!invite) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const meta = await getFamilyInviteMeta(params.code);
  if (meta?.setupComplete) {
    return NextResponse.json(
      {
        error: "use_family_setup",
        message: "Family already set up. Open the link on a new phone and pick a child.",
      },
      { status: 409 },
    );
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

  return NextResponse.json(
    {
      error: "use_family_setup",
      message: "Use the family setup flow at /join/[code].",
    },
    { status: 400 },
  );
}
