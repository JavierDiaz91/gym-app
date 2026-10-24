"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startPlanSession, finishPlanSession, markPlanExercise } from "./plan-session-actions";

type Prescription = { sets?: number; reps?: string; rir?: string; restSeconds?: number; durationSeconds?: number; distanceMeters?: number; tempo?: string; notes?: string };
type Item = { key: string; title: string; imageUrl?: string; imageVerified?: boolean; instructions?: string; prescriptions: Prescription[] };
type Block = { title: string; type?: string; items: Item[] };
type Props = { assignmentId: number; week: number; day: number; title: string; blocks: Block[]; status: string; initialCompleted: string[]; startedAt?: string | null; finishedAt?: string | null };

export default function PlanSessionClient({ assignmentId, week, day, title, blocks, status, initialCompleted, startedAt, finishedAt }: Props) {
  const router = useRouter();
  const [pending, transition] = useTransition();
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState<string[]>(initialCompleted);
  const total = blocks.reduce((n, b) => n + b.items.length, 0);
  const done = blocks.reduce((n, b) => n + b.items.filter(i => completed.includes(i.key)).length, 0);
  function run(action: () => Promise<{success:boolean;error?:string}>, after?: () => void) {
    setError("");
    transition(async () => {
      try {
        const result = await action();
        if (!result.success) { setError(result.error || "No se pudo completar la operación"); return; }
        after?.();
        router.refresh();
      } catch { setError("No se pudo conectar. Intentá nuevamente."); }
    });
  }
  return (
    <div className="space-y-7">
      <section className="rounded-2xl border-2 border-slate-300 bg-white p-5 shadow-sm space-y-4 dark:border-slate-600 dark:bg-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">Semana {week} · Día {day}</p>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-sm text-muted-foreground">{status === "completed" ? "Sesión finalizada" : status === "in_progress" ? "Sesión en curso" : "Lista para empezar"}</p>
          </div>
          <div className="rounded-xl bg-muted px-4 py-2 text-sm font-semibold">{done} de {total} ejercicios</div>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: total ? `${done / total * 100}%` : "0%" }} /></div>
        {status === "not_started" && <button disabled={pending} onClick={() => run(() => startPlanSession(assignmentId, week, day))} className="w-full rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50">Iniciar actividad</button>}
        {status === "in_progress" && <button disabled={pending || done !== total || total === 0} onClick={() => {
          if (!window.confirm("¿Finalizar esta actividad? No podrás volver a editarla.")) return;
          run(() => finishPlanSession(assignmentId, week, day));
        }} className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white disabled:opacity-40">Finalizar actividad</button>}
        {status === "in_progress" && done !== total && <p className="text-xs text-muted-foreground">Marcá todos los ejercicios realizados para habilitar la finalización.</p>}
        {status === "completed" && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">Actividad finalizada. No se puede finalizar por segunda vez.</div>}
        {startedAt && <p className="text-xs text-muted-foreground">Inicio: {new Date(startedAt).toLocaleString("es-AR")}{finishedAt ? ` · Fin: ${new Date(finishedAt).toLocaleString("es-AR")}` : ""}</p>}
        {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}
      </section>
      {blocks.map((block, index) => (
        <section key={index} className="space-y-4">
          <div className="flex items-center gap-3 border-b-2 border-slate-300 pb-3 dark:border-slate-700"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">{index + 1}</span><h3 className="text-lg font-bold">{block.title}</h3></div>
          {block.items.map((item, itemIndex) => {
            const p = item.prescriptions?.[week - 1] || {};
            const checked = completed.includes(item.key);
            return (
              <article key={item.key || itemIndex} className={`overflow-hidden rounded-2xl border-2 bg-white shadow-md ring-1 ring-black/5 transition-colors dark:bg-slate-950 dark:ring-white/5 ${checked ? "border-emerald-500 dark:border-emerald-400" : "border-slate-300 dark:border-slate-600"}`}>
                {item.imageVerified === true && item.imageUrl && /^https:\/\//.test(item.imageUrl) && <div className="border-b p-3"><details className="group"><summary className="cursor-pointer text-sm font-semibold text-primary">Ver demostración del ejercicio</summary><img src={item.imageUrl} alt={`Demostración verificada de ${item.title}`} loading="lazy" className="mt-3 h-36 w-48 max-w-full rounded-lg border bg-muted object-contain" /></details></div>}
                <div className="p-4 sm:p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-xs text-muted-foreground">Ejercicio {itemIndex + 1}</p><h4 className="text-lg font-bold text-slate-950 dark:text-white">{item.title}</h4></div>
                    {status !== "not_started" && <label className="flex shrink-0 items-center gap-2 text-sm font-semibold cursor-pointer"><input type="checkbox" disabled={pending || status === "completed"} checked={checked} onChange={e => {
                      const next = e.target.checked;
                      run(() => markPlanExercise(assignmentId, week, day, item.key, next), () => setCompleted(old => next ? [...old.filter(k => k !== item.key), item.key] : old.filter(k => k !== item.key)));
                    }} className="h-5 w-5 accent-emerald-600" />Hecho</label>}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {p.sets != null && <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-900"><p className="text-xs text-muted-foreground">Series</p><p className="text-lg font-bold">{p.sets}</p></div>}
                    {p.reps && <div className="rounded-xl bg-muted/70 p-3"><p className="text-xs text-muted-foreground">Repeticiones</p><p className="text-lg font-bold">{p.reps}</p></div>}
                    {p.durationSeconds != null && <div className="rounded-xl bg-muted/70 p-3"><p className="text-xs text-muted-foreground">Duración</p><p className="text-lg font-bold">{p.durationSeconds} seg</p></div>}
                    {p.rir && <div className="rounded-xl bg-muted/70 p-3"><p className="text-xs text-muted-foreground">RIR</p><p className="text-lg font-bold">{p.rir}</p></div>}
                    {p.restSeconds != null && <div className="rounded-xl bg-muted/70 p-3"><p className="text-xs text-muted-foreground">Descanso</p><p className="text-lg font-bold">{p.restSeconds} seg</p></div>}
                    {p.tempo && <div className="rounded-xl bg-muted/70 p-3"><p className="text-xs text-muted-foreground">Tempo</p><p className="text-lg font-bold">{p.tempo}</p></div>}
                    {p.distanceMeters != null && <div className="rounded-xl bg-muted/70 p-3"><p className="text-xs text-muted-foreground">Distancia</p><p className="text-lg font-bold">{p.distanceMeters} m</p></div>}
                  </div>
                  {item.instructions && <p className="text-sm leading-relaxed text-muted-foreground"><strong className="text-foreground">Cómo hacerlo:</strong> {item.instructions}</p>}
                  {p.notes && <p className="text-sm text-muted-foreground">{p.notes}</p>}
                  {(!item.imageUrl || item.imageVerified !== true) && <p className="text-xs text-muted-foreground italic">Demostración visual pendiente de verificación por el entrenador.</p>}
                </div>
              </article>
            );
          })}
        </section>
      ))}
    </div>
  );
}
