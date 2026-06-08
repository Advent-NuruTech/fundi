import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminToken, SESSION_COOKIE } from "@/lib/admin/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply to /ffmanage routes
  if (!pathname.startsWith("/ffmanage")) {
    return NextResponse.next();
  }

  // Always allow the login page and its assets
  if (
    pathname === "/ffmanage/login" ||
    pathname.startsWith("/ffmanage/_next")
  ) {
    return NextResponse.next();
  }

  // Read admin session cookie
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/ffmanage/login", request.url));
  }

  // Verify HMAC signature + expiry (no DB call — fast edge check)
  const payload = await verifyAdminToken(token);
  if (!payload) {
    const response = NextResponse.redirect(
      new URL("/ffmanage/login", request.url)
    );
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  // Pass uid in a header so API routes can use it without re-parsing the token
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-admin-uid", payload.uid);
  requestHeaders.set("x-admin-session-id", payload.sessionId);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/ffmanage/:path*"],
};
