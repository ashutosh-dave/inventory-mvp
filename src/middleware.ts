import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

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

export const runtime = "nodejs";

export default auth((req) => {
  const { nextUrl } = req;

  if (nextUrl.pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const isProtected = protectedPrefixes.some((prefix) =>
    nextUrl.pathname.startsWith(prefix),
  );

  if (!isProtected) return NextResponse.next();

  if (!req.auth) {
    if (nextUrl.pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  return NextResponse.next();
});

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
