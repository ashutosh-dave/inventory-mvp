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

const AUTH_COOKIE_DEV = "authjs.session-token";
const AUTH_COOKIE_PROD = "__Secure-authjs.session-token";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const isProtected = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (!isProtected) return NextResponse.next();

  const hasSession =
    req.cookies.has(AUTH_COOKIE_PROD) || req.cookies.has(AUTH_COOKIE_DEV);

  if (!hasSession) {
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
