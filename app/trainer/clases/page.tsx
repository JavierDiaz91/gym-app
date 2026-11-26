import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import ClassesManager from "@/components/classes/ClassesManager";
import { listGymClasses } from "@/app/clases-actions";
export default async function TrainerClassesPage() {
 const session = await getSession();
 if (!session) redirect("/login");
 if (session.role !== "trainer" || session.gymId == null) redirect("/trainer");
 const [access] = await sql`SELECT public.kivra_gym_module_enabled(${session.gymId}::integer, 'classes', ${session.role}::text) AS enabled`;
 if (access?.enabled !== true) redirect("/trainer");
 const data=await listGymClasses();
 if(data.role!=="trainer") return <p>Sin permisos</p>;
 return <ClassesManager initial={data as any} role="trainer"/>;
}
