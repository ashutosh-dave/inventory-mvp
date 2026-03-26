import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const isProtected = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (!isProtected) return NextResponse.next();

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
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
