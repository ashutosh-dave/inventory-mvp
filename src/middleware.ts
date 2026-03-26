import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPrefixes = [
  "/api",
  "/dashboard",
  "/stock-counting",
  "/low-stock",
  "/inventory-search",
  "/movements",
  "/products",
  "/categories",
  "/warehouses",
  "/teams",
  "/audit-log",
];

const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "__Host-authjs.session-token",
  "__Host-next-auth.session-token",
];

function hasSessionCookie(req: NextRequest): boolean {
  return SESSION_COOKIE_NAMES.some((name) => req.cookies.has(name));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const isProtected = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (!isProtected) return NextResponse.next();

  if (!hasSessionCookie(req)) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/stock-counting/:path*",
    "/low-stock/:path*",
    "/inventory-search/:path*",
    "/movements/:path*",
    "/products/:path*",
    "/categories/:path*",
    "/warehouses/:path*",
    "/teams/:path*",
    "/audit-log/:path*",
  ],
};
