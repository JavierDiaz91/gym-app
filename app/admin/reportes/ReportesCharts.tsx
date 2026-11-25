"use client";

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ReportesChartsProps {
  attendanceData: { date: string; visitas: number }[];
  revenueData: { month: string; ingresos: number }[];
  membershipDist: { name: string; count: number }[];
  metrics: {
    avgVisitsPerMember: string;
    peakHour: string;
    avgRevenuePerMember: string;
  };
}

const COLORS = [
  "#06b6b9", // Azul
  "#10b981", // Verde
  "#f59e0b", // Ámbar
  "#8b5cf6", // Púrpura
  "#ec4899", // Rosa
];

export function ReportesCharts({
  attendanceData,
  revenueData,
  membershipDist,
  metrics,
}: ReportesChartsProps) {
  return (
    <div className="grid min-w-0 grid-cols-1 xl:grid-cols-2 gap-4">
      {/* Asistencias del período */}
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Asistencia Diaria</CardTitle>
          <CardDescription>Visitas registradas en las fechas seleccionadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] min-w-0">
            {attendanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))"
                    }}
                  />
                  <Line 
                    type="linear" 
                    dataKey="visitas" 
                    stroke="#06b6b9" 
                    strokeWidth={2}
                    dot={attendanceData.length <= 31 ? { fill: "#06b6b9", r: 3 } : false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No hay asistencias en el período
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ingresos del período */}
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Ingresos Mensuales</CardTitle>
          <CardDescription>Cobros completados en las fechas seleccionadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] min-w-0">
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))"
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString("es-AR")}`, "Ingresos"]}
                  />
                  <Bar dataKey="ingresos" fill="#06b6b9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No hay pagos registrados en la base de datos
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Distribución de Membresías */}
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Distribución de Membresías</CardTitle>
          <CardDescription>Membresías y pases cobrados por plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] min-w-0">
            {membershipDist.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={membershipDist}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: { name: string; percent: number }) => 
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={95}
                    dataKey="count"
                    nameKey="name"
                  >
                    {membershipDist.map((entry, index) => (
                      <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No hay ventas en el período
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Métricas Clave Dinámicas */}
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Métricas Clave</CardTitle>
          <CardDescription>Indicadores calculados con datos reales de la BD</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground text-sm">Promedio de visitas por asistente</span>
            <span className="font-semibold">{metrics.avgVisitsPerMember}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground text-sm">Hora de mayor concurrencia</span>
            <span className="font-semibold">{metrics.peakHour}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground text-sm">Plan más popular</span>
            <span className="font-semibold">{membershipDist[0]?.name || "Sin datos"}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-muted-foreground text-sm">Ingreso promedio por membresía o pase vendido</span>
            <span className="font-semibold">{metrics.avgRevenuePerMember}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground text-sm">Estado de la Base de Datos</span>
            <span className="text-emerald-500 font-semibold flex items-center gap-1 text-sm">
              ● Conectado
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}