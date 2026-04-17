import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  // In development, skip all auth checks
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isPublic =
    nextUrl.pathname === "/" ||
    nextUrl.pathname.startsWith("/api/auth") ||
    nextUrl.pathname.startsWith("/api/revalidate");

  if (isPublic) return NextResponse.next();

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
