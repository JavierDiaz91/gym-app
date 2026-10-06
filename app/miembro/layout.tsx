import React from "react";
import MemberSidebar from "@/components/member/sidebar";
import { getSession } from "@/app/actions";
import { redirect } from "next/navigation";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "member") redirect("/login");

  // Armamos los datos del usuario resolviendo cualquier variación en la sesión
  const userData = {
    name:
      session.user?.name ||
      session.name ||
      (session.user?.first_name
        ? `${session.user.first_name} ${session.user.last_name || ""}`.trim()
        : null) ||
      "Javier Diaz",
    email: session.user?.email || session.email || "",
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <MemberSidebar user={userData} />
      <main className="flex-1 w-full min-w-0 p-4 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}