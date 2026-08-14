import { NextRequest, NextResponse } from "next/server";
import { getInviteByCode } from "@/lib/invitesStore";
import { INVITE_HEADER } from "@/lib/inviteHeader";

export { INVITE_HEADER };

/**
 * Family gate for AI and mutating routes.
 *
 * Every AI route falls back to the server's own `GEMINI_API_KEY`, so an
 * unauthenticated route lets anyone on the internet spend the owner's quota —
 * and `/api/summary` would let them send WhatsApp messages to the parents.
 * A valid invite code is the credential the whole product already issues, so
 * it is what gates these routes.
 *
 * Returns `null` when the caller is allowed through, or the 401 to return.
 */
export async function requireInvite(
  request: NextRequest,
): Promise<NextResponse | null> {
  const code = request.headers.get(INVITE_HEADER)?.trim();
  if (!code) {
    return NextResponse.json(
      { error: "invite_required", message: "Open Arjuna from your family link." },
      { status: 401 },
    );
  }

  const invite = await getInviteByCode(code);
  if (!invite) {
    return NextResponse.json(
      { error: "invite_invalid", message: "This family link is not valid." },
      { status: 401 },
    );
  }

  return null;
}
