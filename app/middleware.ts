import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeSession, getSessionCookieName } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get(getSessionCookieName());
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isTrainerRoute = pathname.startsWith("/trainer");
  const isMemberRoute = pathname.startsWith("/miembro");

  // ❌ Sin sesión → login
  if (!sessionCookie && (isAdminRoute || isTrainerRoute || isMemberRoute)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (sessionCookie) {
    const session = await decodeSession(sessionCookie.value);
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // 🔒 Admin ONLY
    if (isAdminRoute && session.role !== "admin") {
      return NextResponse.redirect(new URL("/miembro", request.url));
    }

    // 🔒 Trainer ONLY (admin también puede entrar)
    if (
      isTrainerRoute &&
      session.role !== "trainer" &&
      session.role !== "admin"
    ) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // 🔒 Member ONLY (admin también puede entrar)
    if (
      isMemberRoute &&
      session.role !== "member" &&
      session.role !== "admin"
    ) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/trainer/:path*", "/miembro/:path*"],
};
