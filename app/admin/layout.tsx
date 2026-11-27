// app/admin/layout.tsx
import React from "react";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar } from "@/components/admin/sidebar";
import { getSession } from "@/app/actions";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // 1. Validar autenticación básica y roles permitidos
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    redirect("/login");
  }

  let gymName: string | undefined;
  let showClasses = false;
  let enabledModules: string[] = [];

  // 2. Si es un Admin del Gimnasio, verificamos el estado real en la Base de Datos
  if (session.role === "admin") {
    if (session.gymId == null) redirect("/login");
    const [gym] = await sql`SELECT name, status FROM gyms WHERE id = ${session.gymId} LIMIT 1`;
    if (!gym) redirect("/login");
    const [access] = await sql`SELECT public.kivra_gym_module_enabled(${session.gymId}::integer, 'classes', 'admin') AS enabled`;
    showClasses = access?.enabled === true;
    const moduleRows = await sql`SELECT module_code FROM public.saas_module_roles WHERE role = 'admin' AND public.kivra_gym_module_enabled(${session.gymId}::integer, module_code, role)`;
    enabledModules = moduleRows.map(row => String(row.module_code));
    gymName = typeof gym.name === "string" ? gym.name.trim() : undefined;

    if (gym.status === "suspended") {
      redirect("/cuenta-suspendida");
    }
  }

  return (
    <div className="relative flex min-h-screen min-w-0 flex-col lg:flex-row bg-background text-foreground antialiased selection:bg-primary/20">
      {/* Luz Ambiental sutil en la esquina superior derecha */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none fixed top-0 right-0 -z-0 h-[400px] w-[min(400px,100vw)] bg-primary/10 blur-[140px] rounded-full"
      />

      {/* Sidebar Navigation */}
      <AdminSidebar userRole={session.role} userEmail={session.email} gymName={gymName} showClasses={showClasses} enabledModules={enabledModules} />

      {/* Contenido Principal */}
      <main className="kivra-admin-content relative z-10 w-full min-w-0 flex-1 p-3 sm:p-5 lg:p-8">
        <div className="mx-auto w-full min-w-0 max-w-7xl space-y-4 sm:space-y-6">
          {session.role === "admin" && <AdminHeader gymName={gymName || "Mi gimnasio"} />}
          {children}
        </div>
      </main>
    </div>
  );
}