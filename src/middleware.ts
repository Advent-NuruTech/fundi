import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminToken, SESSION_COOKIE } from "@/lib/admin/session";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, noimageindex",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  "Pragma": "no-cache",
  "Expires": "0",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only intercept /ffmanage routes
  if (!pathname.startsWith("/ffmanage")) {
    return NextResponse.next();
  }

  // Login + temp register page: allow through but still apply security headers
  if (
    pathname === "/ffmanage/login" ||
    pathname === "/ffmanage/register" ||
    pathname.startsWith("/ffmanage/_next")
  ) {
    return applySecurityHeaders(NextResponse.next());
  }

  // Root redirect (/ffmanage → /ffmanage/dashboard) needs auth too
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    const redirectRes = NextResponse.redirect(new URL("/ffmanage/login", request.url));
    redirectRes.cookies.delete(SESSION_COOKIE);
    return applySecurityHeaders(redirectRes);
  }

  // Verify HMAC signature + expiry (stateless edge check — no DB call)
  const payload = await verifyAdminToken(token);
  if (!payload) {
    const redirectRes = NextResponse.redirect(new URL("/ffmanage/login", request.url));
    redirectRes.cookies.delete(SESSION_COOKIE);
    return applySecurityHeaders(redirectRes);
  }

  // Forward admin identity to downstream API routes and pages
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-admin-uid", payload.uid);
  requestHeaders.set("x-admin-session-id", payload.sessionId);

  return applySecurityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } })
  );
}

export const config = {
  matcher: ["/ffmanage/:path*"],
};
