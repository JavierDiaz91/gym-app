import React from "react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { getSession } from "@/app/actions";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Permite el paso tanto a "admin" (del gimnasio) como a "superadmin" (del SaaS)
  if (!session || (session.role !== "admin" && session.role !== "superadmin")) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar userRole={session.role} />
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}