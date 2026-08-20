// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("session");
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isTrainerRoute = pathname.startsWith("/trainer");
  const isMemberRoute = pathname.startsWith("/miembro");

  // ❌ 1️⃣ SIN SESIÓN → Mandar derecho al login
  if (!sessionCookie && (isAdminRoute || isTrainerRoute || isMemberRoute)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 🔒 2️⃣ CON SESIÓN → Validar roles de forma estricta
  if (sessionCookie) {
    try {
      const session = JSON.parse(sessionCookie.value);

      // 👑 Regla Admin ONLY
      if (isAdminRoute && session.role !== "admin") {
        // Si no es admin, lo pateamos a su respectiva zona según su rol
        const fallbackUrl = session.role === "trainer" ? "/trainer" : "/miembro";
        return NextResponse.redirect(new URL(fallbackUrl, request.url));
      }

      // 🏋️ Regla Trainer ONLY (Admin también puede pasar)
      if (isTrainerRoute && session.role !== "trainer" && session.role !== "admin") {
        // Si un miembro común intenta entrar acá, lo mandamos a su panel de alumno
        return NextResponse.redirect(new URL("/miembro", request.url));
      }

      // 👤 Regla Member ONLY (Admin también puede pasar)
      if (isMemberRoute && session.role !== "member" && session.role !== "admin") {
        // Si el entrenador intenta entrar a /miembro, lo mandamos a su panel de trainer
        return NextResponse.redirect(new URL("/trainer", request.url));
      }

    } catch {
      // Si la cookie está corrupta o rota, limpiamos y mandamos a loguear
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

// Esto le dice a Next.js exactamente qué rutas monitorear desde el segundo cero
export const config = {
  matcher: ["/admin/:path*", "/trainer/:path*", "/miembro/:path*"],
};