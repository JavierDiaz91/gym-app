import { Card, CardContent } from "@/components/ui/card";
import { getDashboardStats, getAttendanceStats } from "@/app/actions";
import { sql } from "@/lib/db";
import { ReportesCharts } from "./ReportesCharts";

async function getRevenueData() {
  try {
    const data = await sql`
      SELECT 
        DATE_TRUNC('month', payment_date) as month,
        SUM(amount) as total
      FROM payments
      WHERE payment_date >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', payment_date)
      ORDER BY month
    `;
    return (data as unknown as { month: string; total: string | number }[]).map((d) => ({
      month: new Date(d.month).toLocaleDateString("es", { month: "short" }),
      ingresos: Number(d.total)
    }));
  } catch (error) {
    console.error("Error revenue SQL:", error);
    return [];
  }
}

async function getMembershipDistribution() {
  try {
    const data = await sql`
      SELECT mp.name, COUNT(*)::int as count
      FROM subscriptions s
      JOIN membership_plans mp ON s.plan_id = mp.id
      WHERE s.status = 'active'
      GROUP BY mp.name
      ORDER BY count DESC
    `;
    return (data as unknown as { name: string; count: string | number }[]).map((d) => ({
      name: String(d.name),
      count: Number(d.count)
    }));
  } catch (error) {
    console.error("Error membership SQL:", error);
    return [];
  }
}

async function getCalculatedMetrics() {
  try {
    // 1. Promedio de visitas por miembro en los últimos 30 días
    const avgVisits = await sql`
      SELECT ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT member_id), 0), 1) as avg
      FROM attendance
      WHERE check_in >= NOW() - INTERVAL '30 days'
    `;

    // 2. Hora pico ajustada a la zona horaria local (Argentina)
    const peak = await sql`
      SELECT 
        EXTRACT(HOUR FROM (check_in AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires')) as hour, 
        COUNT(*) as total
      FROM attendance
      GROUP BY hour
      ORDER BY total DESC
      LIMIT 1
    `;

    // 3. Ingreso promedio por suscripción activa
    const avgRevenue = await sql`
      SELECT ROUND(AVG(mp.price)::numeric, 0) as avg
      FROM subscriptions s
      JOIN membership_plans mp ON s.plan_id = mp.id
      WHERE s.status = 'active'
    `;

    const peakHourFormatted = peak.length > 0 
      ? `${Math.floor(Number(peak[0].hour))}:00 - ${Math.floor(Number(peak[0].hour)) + 1}:00 hs` 
      : "Sin datos suficientes";

    const avgVisitsVal = (avgVisits as unknown as { avg: string | number }[])[0]?.avg;
    const avgRevenueVal = (avgRevenue as unknown as { avg: string | number }[])[0]?.avg;

    return {
      avgVisitsPerMember: avgVisitsVal ? `${avgVisitsVal} visitas` : "0 visitas",
      peakHour: peakHourFormatted,
      avgRevenuePerMember: avgRevenueVal ? `$${Number(avgRevenueVal).toLocaleString()}` : "$0",
    };
  } catch (error) {
    console.error("Error calculated metrics SQL:", error);
    return {
      avgVisitsPerMember: "0 visitas",
      peakHour: "Sin datos",
      avgRevenuePerMember: "$0",
    };
  }
}
export default async function ReportesPage() {
  const [stats, attendanceStats, revenueData, membershipDist, calculatedMetrics] = await Promise.all([
    getDashboardStats(),
    getAttendanceStats(),
    getRevenueData(),
    getMembershipDistribution(),
    getCalculatedMetrics(),
  ]);

  const attendanceData = (attendanceStats || [])
    .slice(0, 14)
    .reverse()
    .map((stat: { date: string; total_visits: string | number }) => ({
      date: new Date(stat.date).toLocaleDateString("es", { day: "numeric", month: "short" }),
      visitas: Number(stat.total_visits),
    }));

  return (
    <div className="space-y-8">
      <div>
        <h1 
          className="text-3xl font-bold"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Reportes
        </h1>
        <p className="text-muted-foreground">
          Análisis y estadísticas del gimnasio
        </p>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Miembros</p>
            <p className="text-3xl font-bold">{stats.totalMembers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Suscripciones Activas</p>
            <p className="text-3xl font-bold">{stats.activeSubscriptions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Visitas Hoy</p>
            <p className="text-3xl font-bold">{stats.todayAttendance}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Ingresos del Mes</p>
            <p className="text-3xl font-bold">${stats.monthlyRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos de Recharts en Client Component con la prop metrics agregada */}
      <ReportesCharts 
        attendanceData={attendanceData}
        revenueData={revenueData}
        membershipDist={membershipDist}
        metrics={calculatedMetrics}
      />
    </div>
  );
}