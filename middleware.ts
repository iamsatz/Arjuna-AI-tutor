import { NextRequest, NextResponse } from "next/server";
import {
  OWNER_COOKIE_NAME,
  verifyOwnerSession,
} from "@/lib/ownerAuth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/owner/login") ||
    pathname.startsWith("/api/owner/login") ||
    pathname.startsWith("/api/owner/logout")
  ) {
    return NextResponse.next();
  }

  const isOwnerPage = pathname.startsWith("/owner");
  const isOwnerApi =
    pathname.startsWith("/api/owner/") ||
    (pathname === "/api/events" && request.method === "GET");

  if (!isOwnerPage && !isOwnerApi) {
    return NextResponse.next();
  }

  const password = process.env.OWNER_PASSWORD;
  const cookie = request.cookies.get(OWNER_COOKIE_NAME)?.value;
  const authorized = await verifyOwnerSession(password, cookie);

  if (!authorized) {
    if (isOwnerApi) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const loginUrl = new URL("/owner/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/owner",
    "/owner/:path*",
    "/api/owner/:path*",
    "/api/events",
  ],
};
