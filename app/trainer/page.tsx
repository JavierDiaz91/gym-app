import Link from "next/link";
import { sql } from "@/lib/db";
import StudentProgressChart, { type StudentOption, type StudentProgressRow } from "@/components/trainer/StudentProgressChart";
import { 
  Users, 
  Dumbbell, 
  TrendingUp, 
  ArrowRight, 
  UserPlus, 
  PlusCircle
} from "lucide-react";
import { getTrainerStats } from "@/app/actions";
import { getSession } from "@/app/actions";

export const revalidate = 0; 

export default async function TrainerDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "trainer") {
    return null;
  }

  const permissions = session.gymId == null ? [] : await sql`SELECT module_code FROM public.saas_module_roles WHERE role = 'trainer' AND public.kivra_gym_module_enabled(${session.gymId}::integer, module_code, 'trainer')`;
  const enabled = new Set(permissions.map(row => String(row.module_code)));
  const showMembers = enabled.has("members");
  const showTraining = enabled.has("training");
  const { totalAlumnos, totalRutinas, assignmentRate } = await getTrainerStats(session.id);
  // Restrict every student and training record to this trainer and tenant.
  const linkedStudents = !showMembers || session.gymId == null ? [] : await sql`
    SELECT DISTINCT m.id, m.first_name, m.last_name
    FROM trainers t
    JOIN trainer_members tm ON tm.trainer_id = t.id
    JOIN members m ON m.id = tm.member_id AND m.gym_id = t.gym_id
    WHERE t.user_id = ${session.id} AND t.gym_id = ${session.gymId}
    ORDER BY m.first_name, m.last_name, m.id
  `;
  const students: StudentOption[] = linkedStudents.map(row => ({
    id: Number(row.id),
    name: `${String(row.first_name)} ${String(row.last_name || "")}`.trim(),
  }));
  const studentIds = students.map(student => student.id);
  const progressRows = showTraining && studentIds.length && session.gymId != null ? await sql`
    SELECT ws.member_id,
           to_char(date_trunc('week', ws.started_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS week,
           COUNT(DISTINCT ws.id) FILTER (WHERE ws.status = 'completed')::int AS completed,
           COUNT(DISTINCT ws.id) FILTER (WHERE ws.status = 'in_progress')::int AS in_progress,
           SUM(GREATEST(wsl.actual_load, 0) * GREATEST(wsl.actual_reps, 0))
             FILTER (WHERE wsl.actual_load IS NOT NULL AND wsl.actual_reps IS NOT NULL) AS volume,
           MAX(wsl.actual_load) FILTER (WHERE wsl.actual_load >= 0) AS max_load
    FROM workout_sessions ws
    JOIN member_training_plans mtp
      ON mtp.id = ws.member_training_plan_id
      AND mtp.member_id = ws.member_id
      AND mtp.gym_id = ${session.gymId}
    JOIN trainers t ON t.id = mtp.trainer_id
      AND t.user_id = ${session.id} AND t.gym_id = ${session.gymId}
    LEFT JOIN workout_set_logs wsl ON wsl.workout_session_id = ws.id
    WHERE ws.member_id = ANY(${studentIds}::bigint[])
      AND ws.started_at >= NOW() - INTERVAL '13 weeks'
    GROUP BY ws.member_id, date_trunc('week', ws.started_at AT TIME ZONE 'UTC')
    ORDER BY week
  ` : [];
  const progress: StudentProgressRow[] = progressRows.map(row => ({
    memberId: Number(row.member_id),
    week: String(row.week),
    completed: Number(row.completed || 0),
    inProgress: Number(row.in_progress || 0),
    volume: row.volume == null ? null : Number(row.volume),
    maxLoad: row.max_load == null ? null : Number(row.max_load),
  }));


  const stats = [
    {
      visible: showMembers,
      title: "Alumnos Activos",
      value: totalAlumnos.toString(),
      description: "Atletas vinculados a tu cuenta",
      icon: Users,
    },
    {
      visible: showTraining,
      title: "Rutinas Creadas",
      value: totalRutinas.toString(),
      description: "Planificaciones creadas",
      icon: Dumbbell,
    },
    {
      visible: showTraining && showMembers,
      title: "Ritmo de Asignación",
      value: `${assignmentRate}%`,
      description: "Atletas con plan activo",
      icon: TrendingUp,
    },
  ].filter(stat => stat.visible);

  return (
    <div className="max-w-6xl mx-auto space-y-8 text-foreground transition-colors">
      
      {/* Banner Principal */}
      <div className="bg-card p-6 sm:p-8 rounded-2xl border border-border shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              ¡Hola de nuevo, Profe! 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {showTraining ? "Gestioná tus funcionalidades deportivas desde un solo lugar." : "Consultá las funcionalidades habilitadas para tu cuenta."}
            </p>
          </div>

          {showMembers && <div className="flex items-center gap-3">
            <Link
              href="/trainer/alumnos"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all duration-200"
            >
              <UserPlus className="w-4 h-4 text-primary-foreground" />
              <span>Vincular Alumno</span>
            </Link>
          </div>}
        </div>
      </div>

      {/* Grid de Tarjetas KPI / Métricas */}
      {stats.length > 0 && <div className={`grid grid-cols-1 gap-5 ${stats.length === 3 ? "md:grid-cols-3" : stats.length === 2 ? "md:grid-cols-2" : ""}`}>
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="bg-card p-5 rounded-2xl border border-border hover:border-primary/40 shadow-lg transition-all duration-300 flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {stat.title}
                  </span>
                  <h3 className="text-3xl font-black text-foreground mt-1 tracking-tight">
                    {stat.value}
                  </h3>
                </div>
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 group-hover:border-primary/50 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4 border-t border-border pt-3">
                {stat.description}
              </p>
            </div>
          );
        })}
      </div>}

      {/* Secciones Principales / Accesos Directos */}
      {(showMembers || showTraining) && <div className={`grid grid-cols-1 gap-6 ${showMembers && showTraining ? "md:grid-cols-2" : ""}`}>
        
        {/* Tarjeta 1: Gestionar Alumnos */}
        {showMembers && <div className="bg-card p-6 rounded-2xl border border-border shadow-lg hover:border-primary/40 transition-all flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-foreground">Mis Alumnos</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Consultá y gestioná los alumnos vinculados a tu cuenta.
              </p>
            </div>
          </div>

          <Link
            href="/trainer/alumnos"
            className="w-full inline-flex items-center justify-between bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold text-xs px-4 py-3 rounded-xl border border-border hover:border-primary/40 transition-all group"
          >
            <span>Ver listado de alumnos</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </Link>
        </div>}

        {/* Tarjeta 2: Gestor de Rutinas */}
        {showTraining && <div className="bg-card p-6 rounded-2xl border border-border shadow-lg hover:border-primary/40 transition-all flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-foreground">Planificador de Rutinas</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Armá, editá y parametrizá plantillas técnicas de fuerza con indicadores RIR y pausas.
              </p>
            </div>
          </div>

          <Link
            href="/trainer/rutinas"
            className="w-full inline-flex items-center justify-between bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs px-4 py-3 rounded-xl shadow-md transition-all duration-200 group"
          >
            <span className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-primary-foreground" />
              Ir al Gestor de Rutinas Oficial
            </span>
            <ArrowRight className="w-4 h-4 text-primary-foreground group-hover:translate-x-1 transition-all" />
          </Link>
        </div>}

      </div>}

      {/* Seguimiento al final: primero los accesos de uso diario. */}
      {showMembers && showTraining && <StudentProgressChart students={students} rows={progress} />}
      {!showMembers && !showTraining && <p className="text-muted-foreground">No hay funcionalidades deportivas habilitadas para este panel.</p>}
    </div>
  );
}