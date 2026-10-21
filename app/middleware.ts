// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/session";
import { getSaaSAccess, isSaaSAccessGateEnabled } from "@/lib/saas-access";

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

  // Rollout guard: all gym-admin reachable pages (admin, trainer, member),
  // except the billing recovery page. Direct APIs require separate guards.
  // Only the explicitly configured test gym is evaluated.
  if (
    isProtectedRoute &&
    session.role === "admin" &&
    session.gymId != null &&
    pathname !== "/admin/mi-suscripcion" &&
    !pathname.startsWith("/admin/mi-suscripcion/") &&
    isSaaSAccessGateEnabled(session.gymId)
  ) {
    try {
      const access = await getSaaSAccess(session.gymId);
      if (!access.allowed) {
        return NextResponse.redirect(new URL("/admin/mi-suscripcion", request.url));
      }
    } catch (error) {
      console.error("Kivra SaaS access check failed", error);
      return new NextResponse("No se pudo verificar el acceso SaaS", { status: 503 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/admin/:path*", "/trainer/:path*", "/miembro/:path*"],
};
