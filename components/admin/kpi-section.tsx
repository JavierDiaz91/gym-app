import { Users, CreditCard, UserCheck, DollarSign } from "lucide-react";

interface KpiStats {
  totalMembers: number;
  activeSubscriptions: number;
  todayAttendance: number;
  monthlyRevenue: number;
}

export function KpiSection({ stats, enabledModules }: { stats: KpiStats; enabledModules?: string[] }) {
  const kpis = [
    {
      module: "members",
      title: "Miembros Activos",
      value: stats.totalMembers,
      subtitle: "Clientes registrados activos",
      icon: Users,
      badgeColor: "bg-info/15 text-info",
      topBar: "bg-info",
      hoverBorder: "hover:border-info/40",
    },
    {
      module: "memberships",
      title: "Suscripciones Vigentes",
      value: stats.activeSubscriptions,
      subtitle: "Pases/Planes al día",
      icon: CreditCard,
      badgeColor: "bg-purple/15 text-purple",
      topBar: "bg-purple",
      hoverBorder: "hover:border-purple/40",
    },
    {
      module: "attendance",
      title: "Asistencias Hoy",
      value: stats.todayAttendance,
      subtitle: "Ingresos de la jornada",
      icon: UserCheck,
      badgeColor: "bg-warning/15 text-warning",
      topBar: "bg-warning",
      hoverBorder: "hover:border-warning/40",
    },
    {
      module: "payments",
      title: "Ingresos del Mes",
      value: `$${stats.monthlyRevenue.toLocaleString("es-AR")}`,
      subtitle: "Recaudación acumulada",
      icon: DollarSign,
      badgeColor: "bg-success/15 text-success",
      topBar: "bg-success",
      hoverBorder: "hover:border-success/40",
    },
  ].filter(kpi => !enabledModules || enabledModules.includes(kpi.module));
  if (!kpis.length) return null;
  const columns = ["", "grid-cols-1", "grid-cols-1 sm:grid-cols-2", "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3", "grid-cols-2 xl:grid-cols-4"][kpis.length];

  return (
    <div className={`grid ${columns} gap-2 sm:gap-4`}>
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <div
            key={index}
            className={`relative min-w-0 overflow-hidden rounded-xl border bg-card p-3 sm:p-5 text-card-foreground shadow-xs transition-all duration-300 ${kpi.hoverBorder}`}
          >
            {/* Tira superior de acento de color */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${kpi.topBar}`} />

            <div className="flex flex-col-reverse items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[11px] leading-tight font-semibold text-muted-foreground uppercase sm:text-xs sm:tracking-wider">
                {kpi.title}
              </span>
              <div className={`shrink-0 p-1.5 sm:p-2.5 rounded-lg ${kpi.badgeColor}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-2 sm:mt-3">
              <div className="break-all text-xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {kpi.value}
              </div>
              <p className="hidden sm:block text-xs text-muted-foreground mt-1">
                {kpi.subtitle}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}