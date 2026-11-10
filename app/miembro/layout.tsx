import React from "react";
import MemberSidebar from "@/components/member/sidebar";
import { getSession } from "@/app/actions";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "member") redirect("/login");

  const [classBenefit] = session.gymId == null ? [] : await sql`
    SELECT 1 FROM members m
    JOIN subscriptions sub ON sub.member_id = m.id
    JOIN membership_plans p ON p.id = sub.plan_id AND p.gym_id = m.gym_id
    WHERE m.user_id = ${session.id} AND m.gym_id = ${session.gymId}
      AND p.includes_classes = true
      AND sub.status IN ('active', 'scheduled') AND sub.payment_status = 'paid'
      AND sub.end_date > CURRENT_DATE
    LIMIT 1`;

  const userData = {
    name: session.email.split("@")[0] || "Alumno",
    email: session.email,
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <MemberSidebar user={userData} showClasses={Boolean(classBenefit)} />
      <main className="flex-1 w-full min-w-0 p-4 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
