import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats, getAttendanceStats } from "@/app/actions";
import { sql } from "@/lib/db";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";

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
    return data.map((d: { month: string; total: string | number }) => ({
      month: new Date(d.month).toLocaleDateString("es", { month: "short" }),
      ingresos: Number(d.total)
    }));
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
}

async function getMembershipDistribution() {
  try {
    const data = await sql`
      SELECT mp.name, COUNT(*) as count
      FROM subscriptions s
      JOIN membership_plans mp ON s.plan_id = mp.id
      WHERE s.status = 'active'
      GROUP BY mp.name
    `;
    return data;
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];

export default async function ReportesPage() {
  const stats = await getDashboardStats();
  const attendanceStats = await getAttendanceStats();
  const revenueData = await getRevenueData();
  const membershipDist = await getMembershipDistribution();

  const attendanceData = attendanceStats.slice(0, 14).reverse().map((stat: { date: string; total_visits: string | number }) => ({
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
          Analisis y estadisticas del gimnasio
        </p>
      </div>

      {/* Summary Cards */}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Asistencia Diaria</CardTitle>
            <CardDescription>Visitas en los ultimos 14 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="visitas" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Ingresos Mensuales</CardTitle>
            <CardDescription>Ingresos de los ultimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Ingresos"]}
                  />
                  <Bar dataKey="ingresos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Membership Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribucion de Membresias</CardTitle>
            <CardDescription>Miembros por tipo de plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {membershipDist.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={membershipDist}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="name"
                    >
                      {membershipDist.map((entry: { name: string }, index: number) => (
                        <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No hay datos de membresias
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Metricas Clave</CardTitle>
            <CardDescription>Indicadores de rendimiento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Tasa de retencion</span>
              <span className="font-semibold">85%</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Promedio visitas/miembro</span>
              <span className="font-semibold">3.2/semana</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Clases mas populares</span>
              <span className="font-semibold">CrossFit, Yoga</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Hora pico</span>
              <span className="font-semibold">18:00 - 20:00</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Ingreso promedio/miembro</span>
              <span className="font-semibold">$450/mes</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
