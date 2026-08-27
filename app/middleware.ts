// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("session");
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isTrainerRoute = pathname.startsWith("/trainer");
  const isMemberRoute = pathname.startsWith("/miembro");
  const isLoginRoute = pathname === "/login";

  // 🔄 Si YA TIENE SESIÓN e intenta ir a /login, lo redirigimos a su panel
  if (sessionCookie && isLoginRoute) {
    try {
      const session = JSON.parse(sessionCookie.value);
      if (session.role === "superadmin") return NextResponse.redirect(new URL("/admin/gimnasios", request.url));
      if (session.role === "admin") return NextResponse.redirect(new URL("/admin", request.url));
      if (session.role === "trainer") return NextResponse.redirect(new URL("/trainer", request.url));
      return NextResponse.redirect(new URL("/miembro", request.url));
    } catch {
      // Si la cookie es inválida, dejamos que pase al login
    }
  }

  // ❌ 1️⃣ SIN SESIÓN → Mandar al login
  if (!sessionCookie && (isAdminRoute || isTrainerRoute || isMemberRoute)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 🔒 2️⃣ CON SESIÓN → Validar roles
  if (sessionCookie) {
    try {
      const session = JSON.parse(sessionCookie.value);

      // 👑 Regla Admin / SuperAdmin
      if (isAdminRoute && session.role !== "admin" && session.role !== "superadmin") {
        const fallbackUrl = session.role === "trainer" ? "/trainer" : "/miembro";
        return NextResponse.redirect(new URL(fallbackUrl, request.url));
      }

      // 🏋️ Regla Trainer
      if (
        isTrainerRoute &&
        session.role !== "trainer" &&
        session.role !== "admin" &&
        session.role !== "superadmin"
      ) {
        return NextResponse.redirect(new URL("/miembro", request.url));
      }

      // 👤 Regla Member
      if (
        isMemberRoute &&
        session.role !== "member" &&
        session.role !== "admin" &&
        session.role !== "superadmin"
      ) {
        return NextResponse.redirect(new URL("/trainer", request.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/admin/:path*", "/trainer/:path*", "/miembro/:path*"],
};