import { redirect } from "next/navigation";
import { getSession, getTrainerMembers, getTrainerRoutines } from "@/app/actions";
import AlumnosClient from "./AlumnosClient";
import { Routine } from "../rutinas/TarjetaRutina";

export const dynamic = "force-dynamic";

export default async function TrainerAlumnosPage() {
  const session = await getSession();
  if (!session || session.role !== "trainer") {
    redirect("/login");
  }

  // Cargar alumnos y catálogo de rutinas en paralelo
  const [rawMembers, serverRoutines] = await Promise.all([
    getTrainerMembers(session.id),
    getTrainerRoutines(session.id),
  ]);

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
        sessionUserId={session.id}
      />
    </div>
  );
}