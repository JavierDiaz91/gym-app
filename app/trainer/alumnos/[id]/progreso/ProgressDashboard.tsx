"use client";

import { useMemo, useState } from "react";
import { Activity, BarChart3, Dumbbell, TrendingUp } from "lucide-react";

export type ProgressSet = {
  exercise: string; week: number; day: number; set: number;
  load: number | null; reps: number | null; rir: number | null;
};
export type ProgressComparison = {
  exercise: string; week: number; day: number;
  plannedSets: number | null; plannedReps: string | null; plannedRir: string | null;
  recordedSets: number;
  actualReps: { set: number; value: number | null }[];
  actualRir: { set: number; value: number | null }[];
  actualLoad: { set: number; value: number | null }[];
};
export type ProgressPlan = {
  id: number; title: string; weeks: number; daysPerWeek: number;
  completed: number; inProgress: number; completedExercises: number;
  weeklyCompleted: number[]; sets: ProgressSet[]; comparisons: ProgressComparison[];
};
type Metric = "load" | "reps" | "rir";

const metricLabel: Record<Metric, string> = { load: "Peso (kg)", reps: "Repeticiones", rir: "RIR" };
const fmt = (n: number) => new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(n);

function TrendChart({ points, metric, weeks }: { points: { week: number; label: string; value: number }[]; metric: Metric; weeks: number }) {
  if (!points.length) return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Sin datos reales registrados para este ejercicio y esta métrica.</div>;
  if (points.length === 1) return (
    <div className="rounded-xl border bg-muted/20 p-6 text-center">
      <p className="text-sm text-muted-foreground">Única medición disponible · Semana {points[0].week}</p>
      <p className="mt-2 text-4xl font-bold text-primary">{fmt(points[0].value)}{metric === "load" ? " kg" : ""}</p>
      <p className="mt-3 text-sm text-muted-foreground">Necesitamos datos de otra semana para dibujar una evolución real.</p>
    </div>
  );
  const width = 680, height = 245, left = 52, right = 22, top = 26, bottom = 48;
  const values = points.map(p => p.value);
  const min = Math.min(...values), max = Math.max(...values);
  const spread = max - min;
  const padding = spread === 0 ? Math.max(1, Math.abs(max) * 0.1) : spread * 0.2;
  const lo = Math.max(0, min - padding), hi = max + padding;
  const x = (week: number) => left + (weeks === 1 ? (width - left - right) / 2 : (week - 1) * (width - left - right) / (weeks - 1));
  const y = (v: number) => top + (hi - v) * (height - top - bottom) / (hi - lo || 1);
  const polyline = points.map(p => `${x(p.week)},${y(p.value)}`).join(" ");
  return (
    <div className="overflow-x-auto rounded-xl border p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[360px] w-full" role="img" aria-label={`Evolución de ${metricLabel[metric]}: ${points.map(p => p.label + " " + fmt(p.value)).join(", ")}`}>
        {[0, 1, 2, 3, 4].map(i => {
          const value = lo + (hi - lo) * i / 4;
          return <g key={i}><line x1={left} x2={width - right} y1={y(value)} y2={y(value)} stroke="currentColor" opacity=".12" /><text x={left - 8} y={y(value) + 4} textAnchor="end" fontSize="11" fill="currentColor" opacity=".7">{fmt(value)}</text></g>;
        })}
        <polyline points={polyline} fill="none" stroke="#0d9488" strokeWidth="3" strokeLinejoin="round" />
        {points.map(p => <g key={p.week}><circle cx={x(p.week)} cy={y(p.value)} r="5" fill="#0d9488" /><text x={x(p.week)} y={y(p.value) - 12} fontSize="12" fontWeight="600" textAnchor="middle" fill="currentColor">{fmt(p.value)}</text></g>)}
        {Array.from({ length: weeks }, (_, i) => <text key={i} x={x(i + 1)} y={height - 13} fontSize="11" textAnchor="middle" fill="currentColor" opacity=".8">Sem. {i + 1}</text>)}
      </svg>
      <p className="text-center text-xs text-muted-foreground">Máximo valor registrado por semana. Los intervalos sin mediciones no representan cero.</p>
    </div>
  );
}

export default function ProgressDashboard({ plans }: { plans: ProgressPlan[] }) {
  const [planId, setPlanId] = useState(plans[0]?.id ?? 0);
  const [metric, setMetric] = useState<Metric>("load");
  const [exercise, setExercise] = useState("");
  const [comparisonWeek, setComparisonWeek] = useState(0);
  const plan = plans.find(p => p.id === planId) || plans[0];
  const exercises = useMemo(() => [...new Set((plan?.sets || []).map(s => s.exercise))].sort((a, b) => a.localeCompare(b, "es")), [plan]);
  const selectedExercise = exercises.includes(exercise) ? exercise : (exercises[0] || "");
  const availableComparisons = (plan?.comparisons || []).filter(c => c.exercise === selectedExercise);
  const comparisonWeeks = [...new Set(availableComparisons.map(c => c.week))].sort((a, b) => a - b);
  const selectedWeek = comparisonWeeks.includes(comparisonWeek) ? comparisonWeek : comparisonWeeks[comparisonWeeks.length - 1];
  const selectedComparisons = availableComparisons.filter(c => c.week === selectedWeek).sort((a, b) => a.day - b.day);
  const points = useMemo(() => {
    if (!plan || !selectedExercise) return [];
    const weekly = new Map<number, number>();
    for (const row of plan.sets) {
      if (row.exercise !== selectedExercise) continue;
      const value = row[metric];
      if (value == null) continue;
      weekly.set(row.week, Math.max(value, weekly.get(row.week) ?? -Infinity));
    }
    return [...weekly.entries()].sort((a, b) => a[0] - b[0]).map(([week, value]) => ({ week, label: `Sem. ${week}`, value }));
  }, [plan, selectedExercise, metric]);
  if (!plan) return null;
  const total = plan.weeks * plan.daysPerWeek;
  const change = points.length >= 2 && points[0].value !== 0 ? (points[points.length - 1].value - points[0].value) / points[0].value * 100 : null;
  const percent = total ? Math.round(plan.completed / total * 100) : 0;
  const changePeriod = points.length >= 2 ? `Sem. ${points[0].week} a ${points[points.length - 1].week}` : "Sin período comparable";
  const completedPct = (week: number) => plan.daysPerWeek ? Math.round((plan.weeklyCompleted[week - 1] || 0) / plan.daysPerWeek * 100) : 0;
  return (
    <section className="space-y-5 rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
      <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold">Dashboard de evolución</h2></div>
      <div>
        <label htmlFor="progress-plan" className="mb-1 block text-sm font-medium">Plan de entrenamiento</label>
        <select id="progress-plan" value={plan.id} onChange={e => { setPlanId(Number(e.target.value)); setExercise(""); }} className="w-full rounded-lg border bg-background p-2 text-sm">
          {plans.map(p => <option key={p.id} value={p.id}>{p.title} · Asignación #{p.id}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Cumplimiento", value: `${percent}%`, icon: Activity },
          { label: "Sesiones finalizadas", value: `${plan.completed} / ${total}`, icon: BarChart3 },
          { label: "En curso", value: String(plan.inProgress), icon: TrendingUp },
          { label: "Ejercicios completados", value: String(plan.completedExercises), icon: Dumbbell },
        ].map(k => <div key={k.label} className="rounded-xl bg-muted/60 p-4"><k.icon className="mb-2 h-4 w-4 text-primary" /><p className="text-xs text-muted-foreground">{k.label}</p><p className="text-2xl font-bold">{k.value}</p></div>)}
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, percent)}%` }} /></div>
      <div className="space-y-3">
        <h3 className="font-semibold">Cumplimiento por semana</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: plan.weeks }, (_, i) => {
            const percentage = completedPct(i + 1);
            return <div key={i} className="rounded-xl border p-3"><div className="mb-2 flex justify-between text-sm"><span>Semana {i + 1}</span><strong>{percentage}%</strong></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, percentage)}%` }} /></div><p className="mt-2 text-xs text-muted-foreground">{plan.weeklyCompleted[i] || 0} de {plan.daysPerWeek} sesiones</p></div>;
          })}
        </div>
      </div>
      <div className="space-y-3 border-t pt-5">
        <h3 className="font-semibold">Evolución de rendimiento por ejercicio</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Ejercicio
            <select value={selectedExercise} onChange={e => setExercise(e.target.value)} disabled={!exercises.length} className="mt-1 block w-full rounded-lg border bg-background p-2">
              {!exercises.length && <option value="">Sin cargas registradas</option>}
              {exercises.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label className="text-sm">Indicador
            <select value={metric} onChange={e => setMetric(e.target.value as Metric)} className="mt-1 block w-full rounded-lg border bg-background p-2">
              <option value="load">Peso (kg)</option><option value="reps">Repeticiones</option><option value="rir">RIR</option>
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-muted/60 p-3"><p className="text-xs text-muted-foreground">Último valor registrado</p><p className="text-xl font-bold">{points.length ? `${fmt(points[points.length - 1].value)}${metric === "load" ? " kg" : ""}` : "Sin datos"}</p></div>
          <div className="rounded-lg bg-muted/60 p-3"><p className="text-xs text-muted-foreground">Semanas con registros</p><p className="text-xl font-bold">{points.length} / {plan.weeks}</p></div>
          <div className="rounded-lg bg-muted/60 p-3"><p className="text-xs text-muted-foreground">Variación porcentual · {changePeriod}</p><p className="text-xl font-bold">{change === null ? "Sin comparación" : `${change > 0 ? "+" : ""}${fmt(change)}%`}</p></div>
        </div>
        <TrendChart points={points} metric={metric} weeks={plan.weeks} />
        <div className="space-y-3 rounded-xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h4 className="font-semibold">Planificado vs. realizado</h4><p className="text-xs text-muted-foreground">Comparación por serie, basada en la prescripción y en las cargas guardadas por el alumno.</p></div>
            {comparisonWeeks.length > 0 && <label className="text-sm">Semana
              <select value={selectedWeek} onChange={e => setComparisonWeek(Number(e.target.value))} className="ml-2 rounded-lg border bg-background p-2">
                {comparisonWeeks.map(week => <option key={week} value={week}>Semana {week}</option>)}
              </select>
            </label>}
          </div>
          {selectedComparisons.length === 0 ? <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">Este ejercicio todavía no tiene registros para comparar.</p> : selectedComparisons.map(c => {
            const series = [...new Set([...c.actualReps.map(v => v.set), ...c.actualRir.map(v => v.set), ...c.actualLoad.map(v => v.set)])].sort((a,b) => a-b);
            const actualValue = (values: { set: number; value: number | null }[], set: number, unit = "") => {
              const found = values.find(v => v.set === set)?.value;
              return found == null ? "Sin registrar" : fmt(found) + unit;
            };
            const numericTarget = c.plannedReps != null && /^\\d+(?:[.,]\\d+)?$/.test(c.plannedReps.trim()) ? Number(c.plannedReps.replace(",", ".")) : null;
            const repsWithData = c.actualReps.filter(v => v.value != null);
            const repsMeeting = numericTarget != null ? repsWithData.filter(v => (v.value ?? 0) >= numericTarget).length : 0;
            return <div key={`${c.week}-${c.day}`} className="space-y-3 rounded-lg bg-muted/30 p-3">
              <h5 className="text-sm font-semibold">Semana {c.week} · Día {c.day}</h5>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg bg-background p-3 text-sm"><p className="text-xs text-muted-foreground">Series prescritas</p><strong>{c.plannedSets ?? "No especificadas"}</strong><p className="mt-1 text-xs">Con cargas registradas: {c.recordedSets}</p></div>
                <div className="rounded-lg bg-background p-3 text-sm"><p className="text-xs text-muted-foreground">Repeticiones prescritas / serie</p><strong>{c.plannedReps ?? "No especificadas"}</strong><p className="mt-1 text-xs">{numericTarget == null ? "Sin porcentaje comparable" : repsWithData.length ? `${repsMeeting} de ${repsWithData.length} series registradas alcanzaron la meta` : "Sin repeticiones reales registradas"}</p></div>
                <div className="rounded-lg bg-background p-3 text-sm"><p className="text-xs text-muted-foreground">RIR prescrito</p><strong>{c.plannedRir ?? "No especificado"}</strong><p className="mt-1 text-xs">Los RIR reales se muestran por serie.</p></div>
              </div>
              {series.length > 0 ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Serie</th><th className="p-2">Peso real</th><th className="p-2">Reps reales</th><th className="p-2">RIR real</th></tr></thead><tbody>{series.map(set => <tr key={set} className="border-b last:border-0"><td className="p-2 font-medium">{set}</td><td className="p-2">{actualValue(c.actualLoad, set, " kg")}</td><td className="p-2">{actualValue(c.actualReps, set)}</td><td className="p-2">{actualValue(c.actualRir, set)}</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">El ejercicio fue marcado, pero no se registraron cargas opcionales.</p>}
            </div>;
          })}
          <p className="text-xs text-muted-foreground">Las series con datos no equivalen necesariamente a series completadas. No se infieren valores faltantes ni se calculan porcentajes sobre campos opcionales vacíos.</p>
        </div>
        <p className="text-xs text-muted-foreground">Todos los valores provienen de los registros del alumno. La variación compara máximos semanales y no implica necesariamente una mejora (especialmente en RIR). El cumplimiento se calcula únicamente con sesiones finalizadas.</p>
      </div>
    </section>
  );
}
