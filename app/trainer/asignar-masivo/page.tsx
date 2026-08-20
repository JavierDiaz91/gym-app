import { getSession } from "@/app/actions";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import BulkAssignClient from "./BulkAssignClient";

export default async function BulkAssignPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userId = session.user?.id || session.id || session.userId;

  let trainerId: number | null = null;
  let members: any[] = [];
  let routines: any[] = [];

  try {
    // 1. Obtener ID del Entrenador
    const trainerResult = await sql`
      SELECT id FROM trainers WHERE user_id = ${userId} OR id = ${userId} LIMIT 1
    `;
    const trainerRows = Array.isArray(trainerResult)
      ? trainerResult
      : (trainerResult as any).rows || [];

    trainerId = trainerRows[0]?.id ? Number(trainerRows[0].id) : Number(userId);

    // 2. Obtener SOLO los alumnos asignados a ESTE entrenador
    const membersResult = await sql`
      SELECT 
        id, 
        first_name, 
        last_name, 
        gender, 
        activity_type, 
        level, 
        routine_id
      FROM members
      WHERE trainer_id = ${trainerId}
      ORDER BY first_name ASC
    `;
    const rawMembers = Array.isArray(membersResult)
      ? membersResult
      : (membersResult as any).rows || [];

    members = rawMembers;

    // 3. Obtener SOLO las rutinas ACTIVAS creadas por ESTE entrenador
    const routinesResult = await sql`
      SELECT * FROM routines 
      WHERE trainer_id = ${trainerId}
        AND (is_archived IS FALSE OR is_archived IS NULL)
      ORDER BY id DESC
    `;
    
    const rawRoutines = Array.isArray(routinesResult)
      ? routinesResult
      : (routinesResult as any).rows || [];

    // Mapeamos dinámicamente en JS para encontrar la columna correcta de nombre
    routines = rawRoutines.map((r: any) => ({
      id: r.id,
      name: r.name || r.title || r.nombre || `Rutina #${r.id}`,
      description: r.description || r.descripcion || "",
    }));

  } catch (error) {
    console.error("Error al cargar datos de asignación masiva:", error);
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-8 space-y-6 transition-colors duration-200">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            Asignación Masiva de Rutinas
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Filtrá tu plantilla de atletas por disciplina, género o nivel y asignales un plan de entrenamiento en lote.
          </p>
        </div>

        <BulkAssignClient initialMembers={members} routines={routines} />
      </div>
    </div>
  );
}