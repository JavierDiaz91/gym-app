import { redirect } from "next/navigation";
import { getSession, getTrainerMembers, getTrainerRoutines } from "@/app/actions";
import AlumnosClient from "./AlumnosClient";
import { listTrainingPlans } from "../rutinas/planes/actions";
import { sql } from "@/lib/db";
import { Routine } from "../rutinas/TarjetaRutina";

export const dynamic = "force-dynamic";

export default async function TrainerAlumnosPage() {
  const session = await getSession();
  if (!session || session.role !== "trainer") {
    redirect("/login");
  }

  // Cargar alumnos y catálogo de rutinas en paralelo
  const [rawMembers, serverRoutines, allPlans] = await Promise.all([
    getTrainerMembers(session.id),
    getTrainerRoutines(session.id),
    listTrainingPlans(),
  ]);

  const publishedPlans = allPlans.filter((p) => p.status === "published");
  const memberIds = (rawMembers || []).map((m: any) => Number(m.id));
  const planAssignments = memberIds.length ? await sql`
    SELECT DISTINCT ON (mtp.member_id) mtp.member_id, tp.title, mtp.source_plan_id
    FROM member_training_plans mtp
    JOIN training_plans tp ON tp.id = mtp.source_plan_id AND tp.gym_id = mtp.gym_id
    WHERE mtp.gym_id = ${Number(session.gymId)} AND mtp.member_id = ANY(${memberIds}::bigint[])
      AND mtp.trainer_id = (SELECT id FROM trainers WHERE user_id = ${session.id} AND gym_id = ${Number(session.gymId)} LIMIT 1)
    ORDER BY mtp.member_id, mtp.id DESC
  ` : [];
  const members = (rawMembers || []).map((row: any) => ({
    id: Number(row.id),
    first_name: row.first_name || row.name || "Alumno",
    last_name: row.last_name || "",
    phone: row.phone || "",
    status: row.status || "active",
    routines: Array.isArray(row.routines) 
      ? row.routines 
      : row.routine_name 
        ? [{ id: Number(row.routine_id), title: row.routine_name }] 
        : [],
    last_workout_at: row.last_workout_at ? String(row.last_workout_at) : undefined,
    training_plan_title: planAssignments.find((p) => Number(p.member_id) === Number(row.id))?.title || undefined,
  }));

  // Mapear el catálogo de rutinas al tipo estricto
  const routines: Routine[] = (serverRoutines || []).map((row: any) => ({
    id: Number(row.id),
    title: row.title || "Sin título",
    notes: typeof row.notes === "string" ? row.notes : JSON.stringify(row.notes || []),
  }));

  return (
    <div className="w-full min-h-screen bg-background text-foreground transition-colors p-4 md:p-6">
      <AlumnosClient 
        initialMembers={members} 
        routines={routines} 
        trainingPlans={publishedPlans} 
        sessionUserId={session.id}
      />
    </div>
  );
}