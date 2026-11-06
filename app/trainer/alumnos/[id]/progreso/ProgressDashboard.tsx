"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";

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

export default function ProgressDashboard({ plans }: { plans: ProgressPlan[] }) {
  const [planId, setPlanId] = useState(plans[0]?.id ?? 0);
  const plan = plans.find(p => p.id === planId) || plans[0];
  if (!plan) return null;
  const total = plan.weeks * plan.daysPerWeek;
  const percent = total > 0 ? Math.min(100, Math.round(plan.completed / total * 100)) : 0;
  return (
    <section className="space-y-5 rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Progreso del alumno</h2>
      </div>
      <div>
        <label htmlFor="progress-plan" className="mb-1 block text-sm font-medium">Plan de entrenamiento</label>
        <select id="progress-plan" value={plan.id} onChange={e => setPlanId(Number(e.target.value))} className="w-full rounded-lg border bg-background p-2 text-sm">
          {plans.map(p => <option key={p.id} value={p.id}>{p.title} · Asignación #{p.id}</option>)}
        </select>
      </div>
      <div className="rounded-xl border bg-muted/10 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Sesiones completadas</p>
            <p className="mt-1 text-2xl font-bold">{plan.completed} <span className="text-base font-normal text-muted-foreground">de {total}</span></p>
          </div>
          <span className="text-2xl font-bold text-primary">{percent}%</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Progreso del plan" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
        {plan.inProgress > 0 && <p className="mt-2 text-xs text-muted-foreground">{plan.inProgress} {plan.inProgress === 1 ? "sesión en curso" : "sesiones en curso"}</p>}
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold">Avance por semana</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: plan.weeks }, (_, i) => {
            const completed = plan.weeklyCompleted[i] || 0;
            const weeklyPercent = plan.daysPerWeek > 0 ? Math.min(100, Math.round(completed / plan.daysPerWeek * 100)) : 0;
            return (
              <div key={i} className="rounded-xl border p-3">
                <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium">Semana {i + 1}</span>
                  <span className="text-muted-foreground">{completed}/{plan.daysPerWeek}</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`Semana ${i + 1}`} aria-valuenow={weeklyPercent} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-primary" style={{ width: `${weeklyPercent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
