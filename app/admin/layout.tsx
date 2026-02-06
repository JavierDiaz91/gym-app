import React from "react"
import { AdminSidebar } from "@/components/admin/sidebar";
import { getSession } from "@/app/actions";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
if (!session || session.role !== "admin") redirect("/login");

  // For demo purposes, allow any logged-in user to access admin
  // In production, uncomment below:
  // if (session.role !== "admin") {
  //   redirect("/miembro");
  // }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
