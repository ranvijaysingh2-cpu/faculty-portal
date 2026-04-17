import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  if (process.env.NODE_ENV === "development") return NextResponse.next();

  const { nextUrl } = req;

  const isPublic =
    nextUrl.pathname === "/" ||
    nextUrl.pathname.startsWith("/api/auth") ||
    nextUrl.pathname.startsWith("/api/revalidate");

  if (isPublic) return NextResponse.next();

  // NextAuth v5 session cookie (HTTPS = __Secure- prefix, HTTP = no prefix)
  const sessionToken =
    req.cookies.get("__Secure-next-auth.session-token") ??
    req.cookies.get("next-auth.session-token");

  if (!sessionToken) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
