import { NextRequest, NextResponse } from "next/server";
import {
  getOwnerSessionToken,
  OWNER_COOKIE_MAX_AGE,
  OWNER_COOKIE_NAME,
} from "@/lib/ownerAuth";

export async function POST(request: NextRequest) {
  const ownerPassword = process.env.OWNER_PASSWORD;

  if (!ownerPassword) {
    return NextResponse.json(
      { error: "missing_config", message: "Add OWNER_PASSWORD to .env.local" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as { password?: string };
  const password = body.password?.trim();

  if (!password || password !== ownerPassword) {
    return NextResponse.json({ error: "invalid_password" }, { status: 401 });
  }

  const token = await getOwnerSessionToken(ownerPassword);
  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: OWNER_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OWNER_COOKIE_MAX_AGE,
  });

  return response;
}
