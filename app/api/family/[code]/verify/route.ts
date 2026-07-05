import { NextRequest, NextResponse } from "next/server";
import { listFamilyChildren } from "@/lib/familyStore";
import { getInviteByCode } from "@/lib/invitesStore";

type RouteContext = { params: { code: string } };

/** Legacy route — returns children without password (invite code is the credential). */
export async function POST(_request: NextRequest, { params }: RouteContext) {
  const invite = await getInviteByCode(params.code);
  if (!invite) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const children = await listFamilyChildren(params.code);
  return NextResponse.json({ ok: true, children });
}
