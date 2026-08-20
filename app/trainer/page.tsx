import Link from "next/link";
import { 
  Users, 
  Dumbbell, 
  TrendingUp, 
  ArrowRight, 
  UserPlus, 
  PlusCircle,
  Sparkles
} from "lucide-react";
import { getTrainerStats } from "@/app/actions";
import { getSession } from "@/app/actions";

export const revalidate = 0; 

export default async function TrainerDashboardPage() {
  const session = await getSession(); 
  const { totalAlumnos, totalRutinas } = await getTrainerStats(session?.id);

  const stats = [
    {
      title: "Alumnos Activos",
      value: totalAlumnos.toString(),
      description: "Atletas vinculados a tu cuenta",
      icon: Users,
    },
    {
      title: "Rutinas Creadas",
      value: totalRutinas.toString(),
      description: "Plantillas de entrenamiento listas",
      icon: Dumbbell,
    },
    {
      title: "Ritmo de Asignación",
      value: "100%",
      description: "Atletas con plan activo",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 text-foreground transition-colors">
      
      {/* Banner Principal */}
      <div className="bg-card p-6 sm:p-8 rounded-2xl border border-border shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00aeef]/10 text-[#00aeef] text-xs font-semibold border border-[#00aeef]/20 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#00aeef]" />
              <span>Panel de Control Pro</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              ¡Hola de nuevo, Profe! 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestioná tus atletas y planificaciones de carga técnica desde un solo lugar.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/trainer/alumnos"
              className="inline-flex items-center gap-2 bg-[#00aeef] hover:bg-[#0098d4] text-black font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all duration-200"
            >
              <UserPlus className="w-4 h-4 text-black" />
              <span>Vincular Alumno</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Grid de Tarjetas KPI / Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="bg-card p-5 rounded-2xl border border-border hover:border-[#00aeef]/40 shadow-lg transition-all duration-300 flex flex-col justify-between group"
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
                <div className="p-2.5 rounded-xl bg-[#00aeef]/10 border border-[#00aeef]/20 group-hover:border-[#00aeef]/50 transition-colors">
                  <Icon className="w-5 h-5 text-[#00aeef]" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4 border-t border-border pt-3">
                {stat.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Secciones Principales / Accesos Directos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Tarjeta 1: Gestionar Alumnos */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-lg hover:border-[#00aeef]/40 transition-all flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#00aeef]/10 text-[#00aeef] flex items-center justify-center border border-[#00aeef]/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-foreground">Mis Alumnos</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Controlá el progreso, asistencia y rutinas individuales asignadas a cada atleta.
              </p>
            </div>
          </div>

          <Link
            href="/trainer/alumnos"
            className="w-full inline-flex items-center justify-between bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold text-xs px-4 py-3 rounded-xl border border-border hover:border-[#00aeef]/40 transition-all group"
          >
            <span>Ver listado de alumnos</span>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-[#00aeef] group-hover:translate-x-1 transition-all" />
          </Link>
        </div>

        {/* Tarjeta 2: Gestor de Rutinas */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-lg hover:border-[#00aeef]/40 transition-all flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#00aeef]/10 text-[#00aeef] flex items-center justify-center border border-[#00aeef]/20">
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
            className="w-full inline-flex items-center justify-between bg-[#00aeef] hover:bg-[#0098d4] text-black font-extrabold text-xs px-4 py-3 rounded-xl shadow-md transition-all duration-200 group"
          >
            <span className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-black" />
              Ir al Gestor de Rutinas Oficial
            </span>
            <ArrowRight className="w-4 h-4 text-black group-hover:translate-x-1 transition-all" />
          </Link>
        </div>

      </div>
    </div>
  );
}