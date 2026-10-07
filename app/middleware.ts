// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("session");
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isTrainerRoute = pathname.startsWith("/trainer");
  const isMemberRoute = pathname.startsWith("/miembro");
  const isLoginRoute = pathname === "/login";
  const isProtectedRoute = isAdminRoute || isTrainerRoute || isMemberRoute;

  const session = sessionCookie
    ? await verifySessionToken(sessionCookie.value)
    : null;

  if (sessionCookie && !session) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("session");
    return response;
  }

  if (session && isLoginRoute) {
    if (session.role === "superadmin") {
      return NextResponse.redirect(new URL("/admin/gimnasios", request.url));
    }
    if (session.role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (session.role === "trainer") {
      return NextResponse.redirect(new URL("/trainer", request.url));
    }
    return NextResponse.redirect(new URL("/miembro", request.url));
  }

  if (!session && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!session) return NextResponse.next();

  if (
    isAdminRoute &&
    session.role !== "admin" &&
    session.role !== "superadmin"
  ) {
    const fallbackUrl =
      session.role === "trainer" ? "/trainer" : "/miembro";
    return NextResponse.redirect(new URL(fallbackUrl, request.url));
  }

  if (
    isTrainerRoute &&
    session.role !== "trainer" &&
    session.role !== "admin" &&
    session.role !== "superadmin"
  ) {
    return NextResponse.redirect(new URL("/miembro", request.url));
  }

  if (
    isMemberRoute &&
    session.role !== "member" &&
    session.role !== "admin" &&
    session.role !== "superadmin"
  ) {
    return NextResponse.redirect(new URL("/trainer", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/admin/:path*", "/trainer/:path*", "/miembro/:path*"],
};
