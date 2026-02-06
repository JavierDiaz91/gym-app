import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats, getMembers, getAttendanceStats } from "@/app/actions";
import { Users, CreditCard, UserCheck, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { AttendanceChart } from "@/components/admin/attendance-chart";

export default async function AdminDashboard() {
  const stats = await getDashboardStats();
  const members = await getMembers();
  const attendanceStats = await getAttendanceStats();

  const chartData = attendanceStats
    .slice(0, 14)
    .reverse()
    .map(stat => ({
      date: new Date(stat.date).toLocaleDateString("es", {
        weekday: "short",
        day: "numeric",
      }),
      visitas: Number(stat.total_visits),
    }));

  const recentMembers = members.slice(0, 5);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Miembros" value={stats.totalMembers} icon={Users} trend="+12%" up />
        <StatCard title="Suscripciones Activas" value={stats.activeSubscriptions} icon={CreditCard} trend="+8%" up />
        <StatCard title="Asistencia Hoy" value={stats.todayAttendance} icon={UserCheck} trend="-5%" />
        <StatCard title="Ingresos del Mes" value={`$${stats.monthlyRevenue}`} icon={DollarSign} trend="+15%" up />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Asistencia Últimos 14 Días</CardTitle>
            <CardDescription>Visitas diarias</CardDescription>
          </CardHeader>
          <CardContent>
            <AttendanceChart data={chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Miembros Recientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentMembers.map(member => (
              <div key={member.id}>
                <p className="font-medium">
                  {member.first_name} {member.last_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {member.plan_name || "Sin membresía"}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, up }: any) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
        <div className={`flex items-center gap-1 text-sm ${up ? "text-green-600" : "text-red-600"}`}>
          {up ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          {trend}
        </div>
        <Icon className="w-6 h-6 mt-2" />
      </CardContent>
    </Card>
  );
}
