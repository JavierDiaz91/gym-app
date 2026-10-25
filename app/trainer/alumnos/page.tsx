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
    SELECT mtp.member_id, mtp.id AS assignment_id, tp.title, mtp.source_plan_id,
      mtp.start_date::text AS start_date, tp.duration_weeks,
      CASE WHEN CURRENT_DATE < mtp.start_date THEN 'scheduled'
           WHEN CURRENT_DATE >= mtp.start_date + (GREATEST(1, tp.duration_weeks) * 7) THEN 'expired'
           ELSE 'current' END AS lifecycle
    FROM member_training_plans mtp
    JOIN training_plans tp ON tp.id = mtp.source_plan_id AND tp.gym_id = mtp.gym_id
    WHERE mtp.gym_id = ${Number(session.gymId)}
      AND mtp.member_id = ANY(${memberIds}::bigint[])
      AND mtp.trainer_id = (SELECT id FROM trainers WHERE user_id = ${session.id} AND gym_id = ${Number(session.gymId)} LIMIT 1)
      AND mtp.status = 'active'
    ORDER BY mtp.member_id, mtp.id DESC
  ` : [];
  const lastSessions = memberIds.length ? await sql`
    SELECT ws.member_id, MAX(ws.finished_at) AS last_finished_at
    FROM workout_sessions ws
    JOIN member_training_plans mtp ON mtp.id = ws.member_training_plan_id
    WHERE ws.member_id = ANY(${memberIds}::bigint[])
      AND ws.status = 'completed'
      AND mtp.gym_id = ${Number(session.gymId)}
      AND mtp.trainer_id = (SELECT id FROM trainers WHERE user_id = ${session.id} AND gym_id = ${Number(session.gymId)} LIMIT 1)
    GROUP BY ws.member_id
  ` : [];
  const lastWorkoutByMember = new Map(lastSessions.map((r) => [Number(r.member_id), r.last_finished_at]));
  const formatArgentinaDate = (value: unknown) => new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(String(value)));
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
    last_workout: lastWorkoutByMember.get(Number(row.id)) ? formatArgentinaDate(lastWorkoutByMember.get(Number(row.id))) + " (Argentina)" : undefined,
    training_plans: planAssignments.filter((p) => Number(p.member_id) === Number(row.id)).map((p) => ({
      assignmentId: Number(p.assignment_id), title: String(p.title), sourcePlanId: Number(p.source_plan_id),
      startDate: String(p.start_date), durationWeeks: Number(p.duration_weeks), lifecycle: String(p.lifecycle),
    })),
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