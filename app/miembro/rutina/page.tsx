import { getSession } from "@/app/actions";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, Dumbbell, CheckCircle2 } from "lucide-react";
import ExerciseCard from "./ExerciseCard";
import PlanSessionClient from "./PlanSessionClient";
import { FinishWorkoutButton } from "./FinishWorkoutButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MiembroRutinaPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session || session.role !== "member" || session.gymId == null) redirect("/login");

  const userId = session.id;

  const resolvedParams = await searchParams;
  const targetRoutineId = resolvedParams?.id ? Number(resolvedParams.id) : null;

  // Los planes multisemana se leen desde la asignación del alumno, no desde routines.
  const planAssignmentId = typeof resolvedParams?.plan === "string" ? Number(resolvedParams.plan) : NaN;
  if (Number.isSafeInteger(planAssignmentId) && planAssignmentId > 0) {
    const members = await sql`
      SELECT id FROM members WHERE user_id = ${userId} AND gym_id = ${session.gymId} LIMIT 1
    `;
    const memberId = members[0]?.id;
    const assignments = memberId ? await sql`
      SELECT mtp.id, mtp.trainer_id, mtp.snapshot_jsonb, tp.title, tp.duration_weeks
      FROM member_training_plans mtp
      LEFT JOIN training_plans tp ON tp.id = mtp.source_plan_id AND tp.gym_id = mtp.gym_id
      WHERE mtp.id = ${planAssignmentId} AND mtp.member_id = ${memberId}
        AND mtp.gym_id = ${session.gymId} AND mtp.status = 'active'
      LIMIT 1
    ` : [];
    if (!assignments.length) {
      return <div className="max-w-4xl mx-auto p-6">Plan no encontrado o no asignado a tu cuenta.</div>;
    }
    type WeekPrescription = { sets?: number; reps?: string; rir?: string; restSeconds?: number; durationSeconds?: number; distanceMeters?: number; tempo?: string; notes?: string };
    type WeekItem = { key: string; title: string; imageUrl?: string; imageVerified?: boolean; instructions?: string; prescriptions: WeekPrescription[] };
    type WeekBlock = { title: string; items: WeekItem[] };
    type WeekDay = { title: string; blocks: WeekBlock[] };
    const snapshot = assignments[0].snapshot_jsonb as { days?: WeekDay[] };
    const days = Array.isArray(snapshot?.days) ? snapshot.days : [];
    const duration = Math.max(1, Math.min(52, Number(assignments[0].duration_weeks) || 4));
    const weekParam = typeof resolvedParams?.week === "string" ? Number(resolvedParams.week) : 1;
    const week = Number.isInteger(weekParam) ? Math.max(1, Math.min(duration, weekParam)) : 1;
    const dayParam = typeof resolvedParams?.day === "string" ? Number(resolvedParams.day) : 1;
    const day = Number.isInteger(dayParam) ? Math.max(1, Math.min(Math.max(1, days.length), dayParam)) : 1;
    const selectedDay = days[day - 1];
    // Validate image URLs against this assignment's trainer and gym.
    const imageRows = selectedDay ? await sql`
      SELECT image_url FROM trainer_exercise_library
      WHERE gym_id = ${session.gymId}
        AND trainer_id = ${assignments[0].trainer_id}
        AND is_active = true AND image_url IS NOT NULL
    ` : [];
    const allowedImages = new Set(imageRows.map((row) => String(row.image_url)));
    const verifiedBlocks = selectedDay?.blocks.map((block) => ({
      ...block,
      items: block.items.map((item) => ({
        ...item,
        imageVerified: typeof item.imageUrl === "string"
          && item.imageUrl.startsWith("https://")
          && allowedImages.has(item.imageUrl),
      })),
    })) ?? [];
    const planUrl = `/miembro/rutina?plan=${planAssignmentId}`;
    const sessions = await sql`
      SELECT id, status, started_at, finished_at
      FROM workout_sessions
      WHERE member_training_plan_id = ${planAssignmentId} AND member_id = ${memberId}
        AND week_number = ${week} AND day_index = ${day}
      LIMIT 1
    `;
    const workoutSession = sessions[0];
    const completedRows = workoutSession ? await sql`
      SELECT item_snapshot_key FROM workout_set_logs
      WHERE workout_session_id = ${workoutSession.id} AND set_index = 1 AND notes = 'completed'
    ` : [];

    const setRows = workoutSession ? await sql`
      SELECT item_snapshot_key, set_index, actual_reps, actual_load, actual_rir
      FROM workout_set_logs WHERE workout_session_id = ${workoutSession.id}
      ORDER BY item_snapshot_key, set_index
    ` : [];
    const initialSets = setRows.map((row) => ({
      key: String(row.item_snapshot_key),
      setIndex: Number(row.set_index),
      reps: row.actual_reps == null ? null : Number(row.actual_reps),
      load: row.actual_load == null ? null : Number(row.actual_load),
      rir: row.actual_rir == null ? null : Number(row.actual_rir),
    }));
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Link href="/miembro" className="inline-flex items-center gap-2 text-sm text-primary"><ArrowLeft className="w-4 h-4" /> Volver al panel</Link>
        <div>
          <p className="text-xs font-semibold text-primary">Plan de entrenamiento · {duration} semanas</p>
          <h1 className="text-2xl font-bold">{String(assignments[0].title || "Mi plan de entrenamiento")}</h1>
        </div>
        <section className="space-y-2">
          <h2 className="font-semibold">Seleccionar semana</h2>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: duration }, (_, index) => index + 1).map((n) => (
              <Link key={n} href={`${planUrl}&week=${n}&day=${day}`}
                aria-current={n === week ? "page" : undefined}
                className={`px-4 py-2 rounded-lg border text-sm ${n === week ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                Semana {n}
              </Link>
            ))}
          </div>
        </section>
        <section className="space-y-2">
          <h2 className="font-semibold">Días de entrenamiento</h2>
          <div className="flex flex-wrap gap-2">
            {days.map((d, index) => (
              <Link key={index} href={`${planUrl}&week=${week}&day=${index + 1}`}
                aria-current={index + 1 === day ? "page" : undefined}
                className={`px-4 py-2 rounded-lg border text-sm ${index + 1 === day ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                Día {index + 1}: {d.title}
              </Link>
            ))}
          </div>
        </section>
        {selectedDay ? (
          <PlanSessionClient
            key={`${planAssignmentId}-${week}-${day}`}
            assignmentId={planAssignmentId} week={week} day={day}
            title={selectedDay.title} blocks={verifiedBlocks}
            status={String(workoutSession?.status || "not_started")}
            initialCompleted={completedRows.map((r) => String(r.item_snapshot_key))}
            initialSets={initialSets}
            startedAt={workoutSession?.started_at ? String(workoutSession.started_at) : null}
            finishedAt={workoutSession?.finished_at ? String(workoutSession.finished_at) : null}
          />
        ) : <p>Este plan todavía no tiene días configurados.</p>}
      </div>
    );
  }


  let routineData: {
    id: number;
    title: string;
    notes?: string;
    exercises: Array<{
      displayName: string;
      imageUrl?: string;
      bloque: {
        series?: number;
        reps?: string;
        rir?: number;
        pausa?: string;
        notas?: string;
      };
    }>;
  } | null = null;

  let isCompletedToday = false;

  try {
    // 1. Obtener ID del miembro con fallback flexible
    const memberRes = await sql`
  SELECT id
  FROM members
  WHERE user_id = ${userId}
    AND gym_id = ${session.gymId}
  LIMIT 1
`;

    const memberRows = Array.isArray(memberRes) ? memberRes : (memberRes as any).rows || [];
    const memberId = memberRows[0]?.id;

    if (memberId) {
      // 2. Buscar la rutina asignada o la solicitada por parámetro
      const routineRes = await sql`
        SELECT 
          r.id, 
          COALESCE(r.title, 'Rutina de Entrenamiento') as title, 
          r.notes
        FROM routines r
        JOIN trainers t ON t.id = r.trainer_id
        WHERE t.gym_id = ${session.gymId}
          AND (r.is_archived IS FALSE OR r.is_archived IS NULL)
          AND (
            EXISTS (
              SELECT 1
              FROM member_routines mr
              WHERE mr.member_id = ${memberId}
                AND mr.routine_id = r.id
                AND (mr.is_active IS TRUE OR mr.is_active IS NULL)
            )
            OR EXISTS (
              SELECT 1
              FROM members m
              WHERE m.id = ${memberId}
                AND m.routine_id = r.id
            )
          )
          ${targetRoutineId ? sql`AND r.id = ${targetRoutineId}` : sql``}
        ORDER BY r.id DESC
        LIMIT 1
      `;

      const routineRows = Array.isArray(routineRes) ? routineRes : (routineRes as any).rows || [];
      const rawRoutine = routineRows[0];

      if (rawRoutine) {
        // 3. Verificación de rutina realizada hoy (Robusta y compatible con Neon/Postgres)
        const logRes = await sql`
  SELECT id 
  FROM workout_logs 
  WHERE member_id = ${memberId} 
    AND routine_id = ${rawRoutine.id}
    AND completed_at >= NOW() - INTERVAL '20 hours'
  LIMIT 1
`;

        const logRows = Array.isArray(logRes) ? logRes : (logRes as any).rows || [];
        isCompletedToday = logRows.length > 0;

        // 4. Parsear ejercicios
        let parsedExercises: any[] = [];

        if (typeof rawRoutine.notes === "string" && rawRoutine.notes.trim().startsWith("[")) {
          try {
            parsedExercises = JSON.parse(rawRoutine.notes);
          } catch (e) {
            console.error("Error al parsear JSON de ejercicios:", e);
          }
        }

        if (parsedExercises.length === 0) {
          const exercisesRes = await sql`
            SELECT 
              e.name AS display_name,
              e.image_url,
              re.sets,
              re.reps,
              re.rir,
              re.rest_seconds AS pausa,
              re.notes
            FROM routine_exercises re
            INNER JOIN exercises e ON e.id = re.exercise_id
            WHERE re.routine_id = ${rawRoutine.id}
            ORDER BY re.order_index ASC, re.id ASC
          `;

          const dbExerciseRows = Array.isArray(exercisesRes) ? exercisesRes : (exercisesRes as any).rows || [];

          parsedExercises = dbExerciseRows.map((ex: any) => ({
            displayName: ex.display_name,
            imageUrl: ex.image_url,
            bloque: {
              series: ex.sets || 3,
              reps: ex.reps || "10-12",
              rir: ex.rir ?? 2,
              pausa: ex.pausa ? `${ex.pausa}s` : "60s",
              notas: ex.notes || "",
            },
          }));
        } else {
          parsedExercises = parsedExercises.map((ex: any) => ({
            displayName: ex.nombre || ex.displayName || "Ejercicio",
            imageUrl: ex.imageUrl || ex.image_url || "",
            bloque: {
              series: ex.series || ex.bloque?.series || 3,
              reps: ex.reps || ex.bloque?.reps || "10-12",
              rir: ex.rir ?? ex.bloque?.rir ?? 2,
              pausa: ex.pausa || ex.bloque?.pausa || "60s",
              notas: ex.notas || ex.bloque?.notas || "",
            },
          }));
        }

        routineData = {
          id: rawRoutine.id,
          title: rawRoutine.title,
          notes: !rawRoutine.notes?.startsWith("[") ? rawRoutine.notes : null,
          exercises: parsedExercises,
        };
      }
    }
  } catch (error) {
    console.error("Error al consultar rutina del miembro:", error);
  }

  if (!routineData) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Link
          href="/miembro"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Panel
        </Link>
        <div className="bg-card border rounded-xl p-12 text-center space-y-3">
          <Dumbbell className="w-10 h-10 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-bold text-foreground">No tenés rutinas asignadas</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Link
        href="/miembro"
        className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al Panel
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{routineData.title}</h1>
          {routineData.notes && (
            <p className="text-xs text-muted-foreground mt-1">{routineData.notes}</p>
          )}
        </div>

        {isCompletedToday && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-3 py-1.5 rounded-full font-medium">
            <CheckCircle2 className="w-4 h-4" /> Realizada Hoy
          </div>
        )}
      </div>

      <div className="space-y-4">
        {routineData.exercises.length > 0 ? (
          <>
            {routineData.exercises.map((ex, idx) => (
              <ExerciseCard
                key={idx}
                index={idx}
                routineId={routineData!.id}
                displayName={ex.displayName}
                imageUrl={ex.imageUrl}
                bloque={ex.bloque}
                readOnly={isCompletedToday} 
                isReadOnly={isCompletedToday} 
              />
            ))}

            {isCompletedToday ? (
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl text-center text-xs text-emerald-300 font-medium">
                ✓ Esta rutina ya fue realizada el día de hoy. Podés consultar los ejercicios en modo vista.
              </div>
            ) : (
              <div className="pt-6">
                <FinishWorkoutButton routineId={routineData.id} />
              </div>
            )}
          </>
        ) : (
          <div className="p-8 border rounded-xl text-center text-xs text-muted-foreground bg-card">
            Esta rutina no posee ejercicios configurados.
          </div>
        )}
      </div>
    </div>
  );
}