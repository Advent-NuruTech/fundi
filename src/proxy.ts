import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminToken, SESSION_COOKIE } from "@/lib/admin/session";

const ADMIN_SECURITY_HEADERS: Record<string, string> = {
  "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, noimageindex",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Pragma: "no-cache",
  Expires: "0",
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

const SHOP_SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

const CLEAN_SHOP_ROUTES: Record<string, string> = {
  "/cart": "/globalsell/cart",
  "/checkout": "/globalsell/checkout",
  "/track": "/globalsell/track",
  "/retail": "/globalsell/retail",
  "/wholesale": "/globalsell/wholesale",
  "/both": "/globalsell/both",
};

const RESERVED_FIRST_SEGMENTS = new Set([
  "_next", "about", "account", "admin", "ai", "analytics", "api", "auth", "both",
  "branches", "businesses", "cart", "checkout", "cookies", "customers", "dashboard",
  "delivery", "employees", "ffmanage", "finance", "forgot-password", "globalsell",
  "help", "inventory", "login", "logout", "marketplace", "messages", "offline",
  "orders", "payments", "portal", "pos", "pricing", "privacy", "production", "profile",
  "register", "retail", "robots.txt", "search", "sell", "settings", "shop-robots.txt",
  "shop-sitemap.xml", "sitemap.xml", "sitemaps", "start-trial", "storefront", "story",
  "support", "terms", "thank-you", "track", "wholesale",
]);

function configuredShopHost(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_SHOP_URL ?? "https://shop.fundiflow.co.ke").hostname;
  } catch {
    return "shop.fundiflow.co.ke";
  }
}

function hostname(request: NextRequest): string {
  return (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .split(":")[0]
    .toLowerCase();
}

function withHeaders(response: NextResponse, headers: Record<string, string>) {
  for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
  return response;
}

async function protectAdmin(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  if (pathname === "/ffmanage/login" || pathname === "/ffmanage/register") {
    return withHeaders(NextResponse.next(), ADMIN_SECURITY_HEADERS);
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const response = NextResponse.redirect(new URL("/ffmanage/login", request.url));
    response.cookies.delete(SESSION_COOKIE);
    return withHeaders(response, ADMIN_SECURITY_HEADERS);
  }

  const payload = await verifyAdminToken(token);
  if (!payload) {
    const response = NextResponse.redirect(new URL("/ffmanage/login", request.url));
    response.cookies.delete(SESSION_COOKIE);
    return withHeaders(response, ADMIN_SECURITY_HEADERS);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-admin-uid", payload.uid);
  requestHeaders.set("x-admin-session-id", payload.sessionId);
  return withHeaders(
    NextResponse.next({ request: { headers: requestHeaders } }),
    ADMIN_SECURITY_HEADERS
  );
}

function shopResponse(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const nextUrl = request.nextUrl.clone();

  if (pathname === "/robots.txt") {
    nextUrl.pathname = "/shop-robots.txt";
    return withHeaders(NextResponse.rewrite(nextUrl), SHOP_SECURITY_HEADERS);
  }
  if (pathname === "/sitemap.xml") {
    nextUrl.pathname = "/shop-sitemap.xml";
    return withHeaders(NextResponse.rewrite(nextUrl), SHOP_SECURITY_HEADERS);
  }
  const sitemapMatch = pathname.match(/^\/sitemaps\/(stores|products)-(\d+)\.xml$/);
  if (sitemapMatch) {
    nextUrl.pathname = `/shop-sitemaps/${sitemapMatch[1]}`;
    nextUrl.search = `?page=${sitemapMatch[2]}`;
    return withHeaders(NextResponse.rewrite(nextUrl), SHOP_SECURITY_HEADERS);
  }

  // Let legacy detail pages resolve their database-backed permanent redirect.
  if (/^\/globalsell\/(store|product)\/[^/]+$/.test(pathname)) {
    return withHeaders(NextResponse.next(), SHOP_SECURITY_HEADERS);
  }

  if (pathname === "/globalsell" || pathname.startsWith("/globalsell/")) {
    const cleanPath = pathname === "/globalsell" ? "/" : pathname.slice("/globalsell".length);
    nextUrl.pathname = cleanPath;
    return NextResponse.redirect(nextUrl, 308);
  }

  if (pathname === "/") {
    nextUrl.pathname = "/globalsell";
    return withHeaders(NextResponse.rewrite(nextUrl), SHOP_SECURITY_HEADERS);
  }

  const cleanDestination = CLEAN_SHOP_ROUTES[pathname];
  if (cleanDestination) {
    nextUrl.pathname = cleanDestination;
    return withHeaders(NextResponse.rewrite(nextUrl), SHOP_SECURITY_HEADERS);
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 1 && !RESERVED_FIRST_SEGMENTS.has(segments[0])) {
    nextUrl.pathname = `/storefront/${segments[0]}`;
    return withHeaders(NextResponse.rewrite(nextUrl), SHOP_SECURITY_HEADERS);
  }
  if (segments.length === 3 && segments[1] === "p" && !RESERVED_FIRST_SEGMENTS.has(segments[0])) {
    nextUrl.pathname = `/storefront/${segments[0]}/p/${segments[2]}`;
    return withHeaders(NextResponse.rewrite(nextUrl), SHOP_SECURITY_HEADERS);
  }

  return withHeaders(NextResponse.next(), SHOP_SECURITY_HEADERS);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/ffmanage")) return protectAdmin(request);

  if (hostname(request) === configuredShopHost()) return shopResponse(request);

  // Internal storefront paths are implementation details, never a second public URL.
  const internalStore = pathname.match(/^\/storefront\/([^/]+)(?:\/p\/([^/]+))?$/);
  if (internalStore) {
    const shopOrigin = process.env.NEXT_PUBLIC_SHOP_URL ?? "https://shop.fundiflow.co.ke";
    const destination = internalStore[2]
      ? `${shopOrigin.replace(/\/$/, "")}/${internalStore[1]}/p/${internalStore[2]}`
      : `${shopOrigin.replace(/\/$/, "")}/${internalStore[1]}`;
    return NextResponse.redirect(destination, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon-16x16.png|favicon-32x32.png|apple-touch-icon.png|manifest.json|sw.js|workbox-.*\\.js).*)",
  ],
};
