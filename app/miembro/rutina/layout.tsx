import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function ModuleLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "member" || session.gymId == null) redirect("/login");
  const [access] = await sql`SELECT public.kivra_gym_module_enabled(${session.gymId}::integer, 'training', 'member') AS enabled`;
  if (access?.enabled !== true) redirect("/miembro/perfil");
  return <>{children}</>;
}
