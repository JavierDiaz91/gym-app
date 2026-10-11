// app/admin/layout.tsx
import React from "react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { getSession, getGymStatusAction } from "@/app/actions";
import { redirect } from "next/navigation";

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

  // 2. Si es un Admin del Gimnasio, verificamos el estado real en la Base de Datos
  if (session.role === "admin") {
    if (session.gymId == null) redirect("/login");
    const gym = await getGymStatusAction(session.gymId); 

    if (gym && gym.status === "suspended") {
      redirect("/cuenta-suspendida");
    }
  }

  return (
    <div className="relative flex min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">
      {/* Luz Ambiental sutil en la esquina superior derecha */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none fixed top-0 right-0 -z-0 h-[400px] w-[400px] bg-primary/10 blur-[140px] rounded-full"
      />

      {/* Sidebar Navigation */}
      <AdminSidebar userRole={session.role} />

      {/* Contenido Principal */}
      <main className="relative z-10 flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="mx-auto max-w-7xl space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}