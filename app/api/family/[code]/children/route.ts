import { NextRequest, NextResponse } from "next/server";
import {
  addFamilyChild,
  getFamilyInviteMeta,
  listFamilyChildren,
  MAX_FAMILY_CHILDREN,
} from "@/lib/familyStore";
import { getInviteByCode } from "@/lib/invitesStore";

type RouteContext = { params: { code: string } };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const invite = await getInviteByCode(params.code);
  if (!invite) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const children = await listFamilyChildren(params.code);
  return NextResponse.json({ children, maxChildren: MAX_FAMILY_CHILDREN });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const invite = await getInviteByCode(params.code);
  if (!invite) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const meta = await getFamilyInviteMeta(params.code);
  if (!meta?.setupComplete) {
    return NextResponse.json({ error: "not_setup" }, { status: 400 });
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

  const result = await addFamilyChild(params.code, {
    childName,
    grade: body.grade?.trim() || undefined,
    board: body.board,
  });

  if (!result.ok) {
    const status =
      result.error === "max_children" || result.error === "duplicate_name"
        ? 409
        : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ child: result.child });
}
