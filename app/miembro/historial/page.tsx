import { getSession } from "@/app/actions";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { Calendar, CheckCircle2, Dumbbell, History } from "lucide-react";

export default async function MemberHistoryPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Capturamos el userId independientemente de si la sesión guarda { user: { id } } o { id }
  const userId = session.user?.id || session.id || session.userId;

  if (!userId) {
    console.error("No se encontró el ID de usuario en la sesión:", session);
    return null;
  }

  let logs: any[] = [];

  try {
    const result = await sql`
      SELECT 
        wl.id,
        wl.completed_at,
        r.title as routine_title
      FROM workout_logs wl
      JOIN routines r ON r.id = wl.routine_id
      JOIN members m ON m.id = wl.member_id
      WHERE m.user_id = ${userId} OR wl.member_id = ${userId}
      ORDER BY wl.completed_at DESC
    `;
    
    logs = Array.isArray(result) ? result : (result as any).rows || [];
  } catch (error) {
    console.error("Error al obtener historial:", error);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Cabecera */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <History className="w-6 h-6 text-primary" />
          Historial de Entrenamientos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Revisá el registro de todas las rutinas que completaste.
        </p>
      </div>

      {/* Lista de Registros */}
      {logs.length === 0 ? (
        <div className="bg-card text-card-foreground border rounded-xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Dumbbell className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-lg">Sin entrenamientos registrados</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Aún no has finalizado ninguna rutina. Cada vez que completes un entrenamiento desde tu panel, quedará registrado aquí.
          </p>
        </div>
      ) : (
        <div className="bg-card text-card-foreground border rounded-xl divide-y">
          {logs.map((log) => (
            <div key={log.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{log.routine_title}</h4>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(log.completed_at).toLocaleDateString("es-AR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}