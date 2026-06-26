import { NextResponse } from "next/server";
import { OWNER_COOKIE_NAME } from "@/lib/ownerAuth";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: OWNER_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
