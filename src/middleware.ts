import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const protectedPrefixes = ["/api", "/dashboard", "/stock-counting"];

// Prisma relies on Node.js APIs; force middleware to run in the Node runtime.
export const runtime = "nodejs";

export default auth((req) => {
  const { nextUrl } = req;

  // Allow NextAuth routes to remain public (sign-in, providers, callbacks).
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
  matcher: ["/api/:path*", "/dashboard/:path*"],
};
