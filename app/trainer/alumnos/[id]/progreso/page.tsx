import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import { ArrowLeft, CheckCircle2, Clock3, Dumbbell } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ id: string }> };
type PlanDay = { title?: string; blocks?: { items?: unknown[] }[] };
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
      {assignments.map((assignment) => {
        const snapshot = assignment.snapshot_jsonb as Snapshot | null;
        const days = Array.isArray(snapshot?.days) ? snapshot.days : [];
        const weeks = Math.max(1, Math.min(52, Number(assignment.duration_weeks) || 4));
        const total = weeks * days.length;
        const planSessions = sessions.filter((s) => Number(s.member_training_plan_id) === Number(assignment.id));
        const completed = planSessions.filter((s) => s.status === "completed").length;
        const percent = total > 0 ? Math.min(100, Math.round(completed / total * 100)) : 0;
        const exercises = planSessions.reduce((sum, s) => sum + Number(s.completed_exercises || 0), 0);
        return (
          <section key={Number(assignment.id)} className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{String(assignment.title)}</h2>
                <p className="text-xs text-muted-foreground">{weeks} semanas · {days.length} días por semana · {String(assignment.status)}</p>
              </div>
              <span className="rounded-lg bg-primary/10 px-3 py-1 text-sm font-bold text-primary">{percent}% completado</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-muted/60 p-4"><p className="text-xs text-muted-foreground">Sesiones completadas</p><p className="text-2xl font-bold">{completed} / {total}</p></div>
              <div className="rounded-xl bg-muted/60 p-4"><p className="text-xs text-muted-foreground">Ejercicios registrados</p><p className="text-2xl font-bold">{exercises}</p></div>
              <div className="rounded-xl bg-muted/60 p-4"><p className="text-xs text-muted-foreground">Sesiones pendientes</p><p className="text-2xl font-bold">{Math.max(0, total - completed)}</p></div>
            </div>
            <div className="space-y-4">
              {Array.from({ length: weeks }, (_, i) => i + 1).map((week) => {
                const finished = planSessions.filter((s) => Number(s.week_number) === week && s.status === "completed").length;
                return (
                  <div key={week} className="rounded-xl border p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h3 className="font-semibold">Semana {week}</h3>
                      <span className="text-xs text-muted-foreground">{finished} / {days.length} sesiones</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {days.map((day, index) => {
                        const entry = planSessions.find((s) => Number(s.week_number) === week && Number(s.day_index) === index + 1);
                        const done = entry?.status === "completed";
                        const active = entry?.status === "in_progress";
                        return (
                          <div key={index} className="rounded-lg border bg-background p-3">
                            <div className="flex items-center gap-2">
                              {done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : active ? <Dumbbell className="h-4 w-4 shrink-0 text-amber-600" /> : <Clock3 className="h-4 w-4 shrink-0 text-muted-foreground" />}
                              <span className="text-sm font-semibold">Día {index + 1}</span>
                            </div>
                            <p className="mt-1 truncate text-xs text-muted-foreground">{day.title || "Entrenamiento"}</p>
                            <p className="mt-2 text-xs font-medium">{done ? "Finalizada" : active ? "En curso" : "Pendiente"}</p>
                            {entry && <p className="mt-1 text-xs text-muted-foreground">{Number(entry.completed_exercises || 0)} ejercicios marcados</p>}
                            {entry?.finished_at && <p className="mt-1 text-xs text-muted-foreground">Finalizó: {new Date(String(entry.finished_at)).toLocaleString("es-AR")}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
