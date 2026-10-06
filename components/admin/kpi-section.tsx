import { Users, CreditCard, UserCheck, DollarSign } from "lucide-react";

interface KpiStats {
  totalMembers: number;
  activeSubscriptions: number;
  todayAttendance: number;
  monthlyRevenue: number;
}

export function KpiSection({ stats }: { stats: KpiStats }) {
  const kpis = [
    {
      title: "Miembros Activos",
      value: stats.totalMembers,
      subtitle: "Clientes registrados activos",
      icon: Users,
      badgeColor: "bg-info/15 text-info",
      topBar: "bg-info",
      hoverBorder: "hover:border-info/40",
    },
    {
      title: "Suscripciones Vigentes",
      value: stats.activeSubscriptions,
      subtitle: "Pases/Planes al día",
      icon: CreditCard,
      badgeColor: "bg-purple/15 text-purple",
      topBar: "bg-purple",
      hoverBorder: "hover:border-purple/40",
    },
    {
      title: "Asistencias Hoy",
      value: stats.todayAttendance,
      subtitle: "Ingresos de la jornada",
      icon: UserCheck,
      badgeColor: "bg-warning/15 text-warning",
      topBar: "bg-warning",
      hoverBorder: "hover:border-warning/40",
    },
    {
      title: "Ingresos del Mes",
      value: `$${stats.monthlyRevenue.toLocaleString("es-AR")}`,
      subtitle: "Recaudación acumulada",
      icon: DollarSign,
      badgeColor: "bg-success/15 text-success",
      topBar: "bg-success",
      hoverBorder: "hover:border-success/40",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <div
            key={index}
            className={`relative overflow-hidden rounded-xl border bg-card p-5 text-card-foreground shadow-xs transition-all duration-300 ${kpi.hoverBorder}`}
          >
            {/* Tira superior de acento de color */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${kpi.topBar}`} />

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {kpi.title}
              </span>
              <div className={`p-2.5 rounded-lg ${kpi.badgeColor}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-3xl font-extrabold tracking-tight text-foreground">
                {kpi.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpi.subtitle}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}