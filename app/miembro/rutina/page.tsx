import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, ArrowLeft, CalendarCheck, Calendar } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ExerciseCard from "./ExerciseCard";
import { FinishWorkoutButton } from "./FinishWorkoutButton";

export const dynamic = "force-dynamic";

interface BloqueEjercicio {
  nombre?: string;
  name?: string;
  series?: number | string;
  reps?: number | string;
  rir?: number | string;
  pausa?: string;
  notas?: string;
  image_url?: string;
  muscle_group?: string;
  equipment?: string;
}

interface PageProps {
  searchParams: Promise<{ routineId?: string }>;
}

async function getMemberRoutinesData(userId: number) {
  try {
    // 1. Obtener TODAS las rutinas activas desde la tabla pivote member_routines
    const routinesRes = await sql`
      SELECT 
        r.id,
        r.title,
        r.notes,
        t.first_name AS trainer_first_name,
        t.last_name AS trainer_last_name,
        m.id AS member_id
      FROM member_routines mr
      JOIN members m ON mr.member_id = m.id
      JOIN routines r ON mr.routine_id = r.id
      LEFT JOIN trainers t ON m.trainer_id = t.id
      WHERE m.user_id = ${userId}
        AND mr.is_active = true
        AND (r.is_archived IS FALSE OR r.is_archived IS NULL)
      ORDER BY mr.id DESC
    `;

    if (!routinesRes.length) return null;

    // 2. Traer catálogo de ejercicios
    const dbExercises = await sql`
      SELECT name, image_url, muscle_group, equipment 
      FROM exercises
    `;

    const exerciseMap = new Map(
      dbExercises.map((e) => [e.name.toLowerCase().trim(), e])
    );

    return {
      routines: routinesRes,
      exerciseMap,
      memberId: routinesRes[0].member_id
    };
  } catch (error) {
    console.error("Error al obtener las rutinas:", error);
    return null;
  }
}

export default async function MiembroRutinaPage(props: PageProps) {
  const session = await getSession();

  if (!session || session.role !== "member") {
    redirect("/login");
  }

  const searchParams = await props.searchParams;
  const selectedRoutineId = searchParams.routineId ? Number(searchParams.routineId) : null;

  const data = await getMemberRoutinesData(session.id);

  if (!data || !data.routines.length) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <Button variant="ghost" asChild className="mb-2">
          <Link href="/miembro">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Panel
          </Link>
        </Button>
        <Card className="p-8 text-center">
          <CardContent className="space-y-3">
            <Dumbbell className="w-10 h-10 text-gray-300 mx-auto" />
            <h2 className="text-xl font-bold text-gray-800">No tenés rutinas asignadas</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determinar cuál rutina mostrar (la seleccionada por URL o la primera de la lista)
  const activeRoutine = data.routines.find((r) => r.id === selectedRoutineId) || data.routines[0];

  // 3. Verificar si el miembro ya registró esta rutina HOY
  const todayLogRes = await sql`
    SELECT id, completed_at 
    FROM workout_logs 
    WHERE member_id = ${data.memberId} 
      AND routine_id = ${activeRoutine.id}
      AND DATE(completed_at) = CURRENT_DATE
    ORDER BY completed_at DESC
    LIMIT 1
  `;

  const isCompletedToday = todayLogRes.length > 0;
  const completedAt = isCompletedToday ? todayLogRes[0].completed_at : null;

  // 4. Parsear ejercicios de la rutina activa
  let bloques: BloqueEjercicio[] = [];
  if (typeof activeRoutine.notes === "string" && activeRoutine.notes.trim() !== "") {
    try {
      const parsed = JSON.parse(activeRoutine.notes);
      if (Array.isArray(parsed)) {
        bloques = parsed;
      }
    } catch {
      // Fallback
    }
  }

  const enrichedBloques = bloques.map((bloque) => {
    const nombreReal = bloque.nombre || bloque.name || "Ejercicio";
    const exerciseName = nombreReal.toLowerCase().trim();

    // Coincidencia con catálogo global
    let match = data.exerciseMap.get(exerciseName);
    if (!match) {
      for (const [dbName, dbEx] of data.exerciseMap.entries()) {
        if (dbName.includes(exerciseName) || exerciseName.includes(dbName)) {
          match = dbEx;
          break;
        }
      }
    }

    // Prioridad: 1. Imagen en la rutina -> 2. Imagen del catálogo -> 3. String vacío (para placeholder)
    const rawUrl = bloque.image_url || match?.image_url || "";
    const finalImageUrl = typeof rawUrl === "string" ? rawUrl.trim() : "";

    return {
      ...bloque,
      nombre: nombreReal,
      image_url: finalImageUrl,
      muscle_group: match?.muscle_group || "General",
      equipment: match?.equipment || "Libre",
    };
  });

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <Button variant="ghost" size="sm" asChild className="rounded-xl hover:bg-gray-100">
        <Link href="/miembro">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Mi Panel
        </Link>
      </Button>

      {/* Selector de Pestañas si tiene más de 1 rutina asignada */}
      {data.routines.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
          {data.routines.map((r) => {
            const isSelected = r.id === activeRoutine.id;
            return (
              <Link
                key={r.id}
                href={`/miembro/rutina?routineId=${r.id}`}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                  isSelected
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                {r.title}
              </Link>
            );
          })}
        </div>
      )}

      {/* Banner de Entrenamiento Completado HOY */}
      {isCompletedToday && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-4 shadow-2xs">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-emerald-950">
              ¡Entrenamiento de hoy completado!
            </h3>
            <p className="text-xs text-emerald-800 mt-0.5">
              Ya registraste esta sesión a las{" "}
              <span className="font-semibold">
                {new Date(completedAt).toLocaleTimeString("es-AR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                  timeZone: "America/Argentina/Buenos_Aires",
                })}
              </span>{" "}
              hs. ¡Excelente trabajo por hoy!
            </p>
          </div>
        </div>
      )}

      {/* Header Rutina */}
      <div className="bg-white border rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none font-semibold">
              {isCompletedToday ? "Entrenamiento Completado" : "Rutina Activa"}
            </Badge>
            {activeRoutine.trainer_first_name && (
              <span className="text-xs text-muted-foreground font-medium">
                Entrenador: {activeRoutine.trainer_first_name} {activeRoutine.trainer_last_name || ""}
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{activeRoutine.title}</h1>
        </div>
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit shrink-0">
          <Dumbbell className="w-7 h-7" />
        </div>
      </div>

      {/* Lista de Ejercicios */}
      {enrichedBloques.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">Ejercicios del Día</h2>
            <span className="text-xs text-muted-foreground font-medium">
              {enrichedBloques.length} ejercicio(s) cargado(s)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {enrichedBloques.map((bloque, index) => {
              const displayName = bloque.nombre || "Ejercicio";

              return (
                <ExerciseCard
                  key={index}
                  index={index}
                  routineId={activeRoutine.id}
                  displayName={displayName}
                  imageUrl={bloque.image_url || ""}
                  bloque={bloque}
                  readOnly={isCompletedToday}
                />
              );
            })}
          </div>

          {!isCompletedToday ? (
            <div className="pt-6 border-t border-gray-100">
              <FinishWorkoutButton routineId={activeRoutine.id} />
            </div>
          ) : (
            <div className="pt-4 text-center">
              <Button asChild variant="outline" className="rounded-xl font-semibold">
                <Link href="/miembro">Volver al Panel Principal</Link>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Card className="p-6">
          <CardContent className="pt-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {activeRoutine.notes || "No hay detalles adicionales registrados para esta rutina."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}