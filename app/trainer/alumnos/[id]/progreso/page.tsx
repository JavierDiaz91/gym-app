import ProgressDashboard, { type ProgressPlan, type ProgressSet } from "./ProgressDashboard";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ id: string }> };
type Prescription = { sets?: number; reps?: string; rir?: string; restSeconds?: number; tempo?: string; durationSeconds?: number; distanceMeters?: number; notes?: string };
type PlanItem = { key?: string; title?: string; prescriptions?: Prescription[] };
type PlanDay = { title?: string; blocks?: { title?: string; items?: PlanItem[] }[] };
const argentinaDate = (value: unknown) => new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: false,
}).format(new Date(String(value)));
type Snapshot = { days?: PlanDay[] };

export default async function ProgresoAlumnoPage({ params }: Props) {
  const session = await getSession();
  if (!session || session.role !== "trainer" || session.gymId == null) redirect("/login");
  const { id } = await params;
  const memberId = Number(id);
  if (!Number.isSafeInteger(memberId) || memberId <= 0) notFound();

  const trainerRows = await sql`
    SELECT id FROM trainers
    WHERE user_id = ${session.id} AND gym_id = ${session.gymId}
    LIMIT 1
  `;
  const trainerId = trainerRows[0]?.id;
  if (!trainerId) notFound();

  const members = await sql`
    SELECT m.id, m.first_name, m.last_name
    FROM members m
    WHERE m.id = ${memberId} AND m.gym_id = ${session.gymId}
      AND EXISTS (
        SELECT 1 FROM trainer_members tm
        WHERE tm.member_id = m.id AND tm.trainer_id = ${trainerId}
      )
    LIMIT 1
  `;
  if (!members.length) notFound();
  const member = members[0];

  const assignments = await sql`
    SELECT mtp.id, mtp.snapshot_jsonb, mtp.status,
           COALESCE(tp.title, 'Plan asignado') AS title,
           COALESCE(tp.duration_weeks, 4) AS duration_weeks
    FROM member_training_plans mtp
    LEFT JOIN training_plans tp
      ON tp.id = mtp.source_plan_id AND tp.gym_id = mtp.gym_id
    WHERE mtp.member_id = ${memberId}
      AND mtp.gym_id = ${session.gymId}
      AND mtp.trainer_id = ${trainerId}
    ORDER BY CASE WHEN mtp.status = 'active' THEN 0 ELSE 1 END, mtp.id DESC
  `;

  const assignmentIds = assignments.map((a) => Number(a.id));
  const sessions = assignmentIds.length ? await sql`
    SELECT ws.id, ws.member_training_plan_id, ws.week_number, ws.day_index,
           ws.status, ws.started_at, ws.finished_at,
           COUNT(DISTINCT wsl.item_snapshot_key) FILTER (
             WHERE wsl.set_index = 1 AND wsl.notes = 'completed'
           )::int AS completed_exercises
    FROM workout_sessions ws
    LEFT JOIN workout_set_logs wsl ON wsl.workout_session_id = ws.id
    WHERE ws.member_id = ${memberId}
      AND ws.member_training_plan_id = ANY(${assignmentIds}::bigint[])
    GROUP BY ws.id, ws.member_training_plan_id, ws.week_number,
             ws.day_index, ws.status, ws.started_at, ws.finished_at
    ORDER BY ws.week_number, ws.day_index
  ` : [];

  const completedKeys = sessions.length ? await sql`
    SELECT wsl.workout_session_id, wsl.item_snapshot_key, wsl.set_index,
           wsl.actual_reps, wsl.actual_load, wsl.actual_rir, wsl.notes
    FROM workout_set_logs wsl
    JOIN workout_sessions ws ON ws.id = wsl.workout_session_id
    WHERE ws.member_id = ${memberId}
      AND ws.member_training_plan_id = ANY(${assignmentIds}::bigint[])
  ` : [];

  const dashboards: ProgressPlan[] = assignments.map((assignment) => {
    const snapshot = assignment.snapshot_jsonb as Snapshot | null;
    const days = Array.isArray(snapshot?.days) ? snapshot.days : [];
    const weeks = Math.max(1, Math.min(52, Number(assignment.duration_weeks) || 4));
    const planSessions = sessions.filter(s => Number(s.member_training_plan_id) === Number(assignment.id));
    const sets: ProgressSet[] = [];
    for (const sessionRow of planSessions) {
      const week = Number(sessionRow.week_number);
      const day = Number(sessionRow.day_index);
      const items = days[day - 1]?.blocks?.flatMap(b => b.items || []) || [];
      for (const log of completedKeys.filter(l => Number(l.workout_session_id) === Number(sessionRow.id))) {
        if (log.actual_load == null && log.actual_reps == null && log.actual_rir == null) continue;
        const item = items.find(i => i.key === String(log.item_snapshot_key));
        if (!item) continue;
        sets.push({
          exercise: String(item.title || "Ejercicio"),
          week, day, set: Number(log.set_index),
          load: log.actual_load == null ? null : Number(log.actual_load),
          reps: log.actual_reps == null ? null : Number(log.actual_reps),
          rir: log.actual_rir == null ? null : Number(log.actual_rir),
        });
      }
    }
    return {
      id: Number(assignment.id), title: String(assignment.title), weeks,
      daysPerWeek: days.length,
      completed: planSessions.filter(s => s.status === "completed").length,
      inProgress: planSessions.filter(s => s.status === "in_progress").length,
      completedExercises: planSessions.reduce((sum, row) => sum + Number(row.completed_exercises || 0), 0),
      weeklyCompleted: Array.from({ length: weeks }, (_, i) => planSessions.filter(s => Number(s.week_number) === i + 1 && s.status === "completed").length),
      sets,
    };
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/trainer/alumnos" className="inline-flex items-center gap-2 text-sm text-primary">
        <ArrowLeft className="h-4 w-4" /> Volver a Mis Alumnos
      </Link>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Seguimiento de entrenamiento</p>
        <h1 className="text-2xl font-bold">{String(member.first_name)} {String(member.last_name || "")}</h1>
        <p className="text-sm text-muted-foreground">Avance de planes y sesiones registradas por el alumno.</p>
      </div>
      {assignments.length === 0 && (
        <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
          Este alumno todavía no tiene planes multisemana asignados por vos.
        </div>
      )}
      {dashboards.length > 0 && <ProgressDashboard plans={dashboards} />}
      {assignments.length > 0 && <Link href={`/trainer/alumnos/${memberId}/progreso/historial`} className="inline-flex rounded-lg border px-4 py-3 text-sm font-semibold text-primary hover:bg-muted">Ver historial de entrenamientos</Link>}
    </div>
  );
}
