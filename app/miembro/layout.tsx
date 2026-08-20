import React from "react"
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

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <MemberSidebar />
      <main className="flex-1 w-full min-w-0 p-4 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}