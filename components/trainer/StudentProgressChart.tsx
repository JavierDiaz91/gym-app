"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Activity, BarChart3 } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type StudentProgressRow = {
  memberId: number;
  week: string;
  completed: number;
  volume: number | null;
  maxLoad: number | null;
};
export type StudentOption = { id: number; name: string };
type Metric = "volume" | "maxLoad" | "completed";
const metricNames: Record<Metric, string> = {
  volume: "Volumen (kg · repeticiones)",
  maxLoad: "Carga máxima (kg)",
  completed: "Sesiones completadas",
};
const formatNumber = (value: number) => new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(value);

export default function StudentProgressChart({ students, rows }: { students: StudentOption[]; rows: StudentProgressRow[] }) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? 0);
  const [metric, setMetric] = useState<Metric>("completed");
  const [weeks, setWeeks] = useState(8);
  const points = useMemo(() => {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const day = start.getUTCDay();
    start.setUTCDate(start.getUTCDate() - ((day + 6) % 7) - (weeks - 1) * 7);
    const values = new Map(rows.filter(r => r.memberId === studentId).map(r => [r.week.slice(0, 10), r]));
    return Array.from({ length: weeks }, (_, i) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + i * 7);
      const key = date.toISOString().slice(0, 10);
      const record = values.get(key);
      return {
        week: key,
        label: date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }),
        value: metric === "completed" ? (record?.completed ?? 0) : (record?.[metric] ?? null),
      };
    });
  }, [rows, studentId, metric, weeks]);
  const hasMeasurements = points.some(p => p.value !== null && (metric === "completed" ? p.value > 0 : true));
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-lg sm:p-5" aria-label="Seguimiento de alumnos">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5 text-primary"><BarChart3 className="h-5 w-5" /></div>
        <div><h2 className="text-lg font-bold">Seguimiento de alumnos</h2><p className="text-xs text-muted-foreground">Evolución y actividad de tus atletas.</p></div>
      </div>
      {students.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Todavía no tenés alumnos vinculados. Vinculá un alumno para ver su evolución.</div>
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-muted-foreground">Alumno
              <select value={studentId} onChange={e => setStudentId(Number(e.target.value))} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground">
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">Indicador
              <select value={metric} onChange={e => setMetric(e.target.value as Metric)} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground">
                <option value="completed">Sesiones completadas</option>
                <option value="volume">Volumen (kg × repeticiones)</option>
                <option value="maxLoad">Carga máxima (kg)</option>
              </select>
            </label>
            {hasMeasurements && <label className="text-xs font-semibold text-muted-foreground">Período
              <select value={weeks} onChange={e => setWeeks(Number(e.target.value))} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground">
                <option value={4}>Últimas 4 semanas</option><option value={8}>Últimas 8 semanas</option><option value={12}>Últimas 12 semanas</option>
              </select>
            </label>}
          </div>
          {hasMeasurements ? (
            <div className="h-64 w-full" role="img" aria-label={`Gráfico de ${metricNames[metric]} por semana`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 12, right: 18, left: 0, bottom: 4 }}>
                  <CartesianGrid stroke="currentColor" strokeOpacity={0.09} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={metric !== "completed"} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={42} />
                  <Tooltip formatter={(value) => [typeof value === "number" ? formatNumber(value) : "Sin registro", metricNames[metric]]} labelFormatter={(label) => `Semana del ${label}`} contentStyle={{ background: "#071827", border: "1px solid #164e63", borderRadius: 12, color: "#e2e8f0" }} />
                  <Line type="monotone" dataKey="value" stroke="#06cfc8" strokeWidth={3} dot={{ r: 4, fill: "#06cfc8" }} activeDot={{ r: 6 }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-4 sm:py-5">
              <Activity className="h-5 w-5 shrink-0 text-primary" />
              <div><p className="text-sm font-semibold">Todavía no hay entrenamientos registrados</p><p className="mt-1 text-xs text-muted-foreground">El gráfico aparecerá cuando el alumno registre sesiones para este indicador.</p></div>
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            {hasMeasurements && <p className="text-xs text-muted-foreground">{metric === "completed" ? "Semanas sin sesiones completadas se muestran en cero." : "Las semanas sin mediciones se dejan sin valor; no se inventan cargas."}</p>}
            <Link href={`/trainer/alumnos/${studentId}/progreso`} className="text-sm font-semibold text-primary hover:underline">Ver progreso completo →</Link>
          </div>
        </>
      )}
    </section>
  );
}
