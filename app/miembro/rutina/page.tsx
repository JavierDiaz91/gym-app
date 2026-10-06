import { getSession } from "@/app/actions";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, Dumbbell, CheckCircle2 } from "lucide-react";
import ExerciseCard from "./ExerciseCard";
import { FinishWorkoutButton } from "./FinishWorkoutButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MiembroRutinaPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const userId = session.user?.id || session.id || session.userId;
  const userEmail = session.user?.email || "";

  const resolvedParams = await searchParams;
  const targetRoutineId = resolvedParams?.id ? Number(resolvedParams.id) : null;

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
  SELECT id FROM members WHERE user_id = ${userId} LIMIT 1
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
        LEFT JOIN member_routines mr ON mr.routine_id = r.id
        LEFT JOIN members m ON m.routine_id = r.id
        WHERE (mr.member_id = ${memberId} OR m.id = ${memberId} OR r.id = ${targetRoutineId || -1})
          ${targetRoutineId ? sql`AND r.id = ${targetRoutineId}` : sql``}
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