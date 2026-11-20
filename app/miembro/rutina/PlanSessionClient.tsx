"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startPlanSession, finishPlanSession, markPlanExercise, saveActualSet } from "./plan-session-actions";

type Prescription = { sets?: number; reps?: string; rir?: string; restSeconds?: number; durationSeconds?: number; distanceMeters?: number; tempo?: string; notes?: string };
type Item = { key: string; title: string; imageUrl?: string; imageVerified?: boolean; instructions?: string; prescriptions: Prescription[] };
type SetLog = { key: string; setIndex: number; reps: number | null; load: number | null; rir: number | null };
type Block = { title: string; type?: string; strengthMode?: "individual" | "biserie" | "triserie"; betweenSetsRestMinSeconds?: number; betweenSetsRestMaxSeconds?: number; items: Item[]; circuitWeeks?: { rounds: number; workSeconds: number; restSeconds: number; betweenRoundsSeconds: number; rpe?: number }[] };
type Props = { durationWeeks?: number; planUrl?: string; readOnly?: boolean; assignmentId: number; week: number; day: number; title: string; blocks: Block[]; status: string; initialCompleted: string[]; initialSets: SetLog[]; startedAt?: string | null; finishedAt?: string | null };

export default function PlanSessionClient({ durationWeeks = 1, planUrl, readOnly = false, assignmentId, week, day, title, blocks, status, initialCompleted, initialSets, startedAt, finishedAt }: Props) {
  const router = useRouter();
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [pending, transition] = useTransition();
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState<string[]>(initialCompleted);
  const [sets, setSets] = useState<SetLog[]>(initialSets);
  const [dirtySeries, setDirtySeries] = useState<string[]>([]);
  const seriesId = (key: string, index: number) => `${key}:${index}`;
  const restLabel = (seconds: number) => seconds % 60 === 0 ? `${seconds / 60} min` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
  const total = blocks.reduce((n, b) => n + b.items.length, 0);
  const done = blocks.reduce((n, b) => n + b.items.filter(i => completed.includes(i.key)).length, 0);
  function changeWeek(target: number) {
    if (!planUrl || target < 1 || target > durationWeeks || target === week) return;
    if (dirtySeries.length && !window.confirm("Tenés series con cambios sin guardar. ¿Cambiar de semana y descartarlos?")) return;
    router.push(`${planUrl}&week=${target}&day=${day}`);
  }
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
    <div className="space-y-5">
      {planUrl && durationWeeks > 1 && <nav aria-label="Semanas del entrenamiento" className="rounded-2xl border border-primary/20 bg-card p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-widest text-primary">Mi entrenamiento</p><span className="text-xs text-muted-foreground">Deslizá para cambiar de semana</span></div>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}>
          {Array.from({ length: durationWeeks }, (_, i) => i + 1).map(n => <button type="button" key={n} aria-current={n === week ? "page" : undefined} onClick={() => changeWeek(n)} className={`min-w-16 flex-1 rounded-xl border px-3 py-3 text-center transition-colors ${n === week ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-muted/40 hover:border-primary/50"}`}><span className="block text-[10px] font-semibold uppercase opacity-80">Semana</span><span className="block text-xl font-black">{n}</span></button>)}
        </div>
        <div className="flex items-center justify-between gap-2"><button type="button" onClick={() => changeWeek(week - 1)} disabled={week <= 1} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-30">← Anterior</button><span className="text-sm font-semibold">Semana {week} de {durationWeeks}</span><button type="button" onClick={() => changeWeek(week + 1)} disabled={week >= durationWeeks} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-30">Siguiente →</button></div>
      </nav>}
      <div className="rounded-3xl border border-primary/20 bg-muted/10 p-3 sm:p-5 space-y-5"
        onTouchStart={e => { setTouchStartX(e.touches[0]?.clientX ?? null); setTouchStartY(e.touches[0]?.clientY ?? null); }}
        onTouchEnd={e => {
          if (touchStartX === null || touchStartY === null) return;
          const deltaX = (e.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;
          const deltaY = (e.changedTouches[0]?.clientY ?? touchStartY) - touchStartY;
          if (Math.abs(deltaX) > 85 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) changeWeek(week + (deltaX < 0 ? 1 : -1));
          setTouchStartX(null); setTouchStartY(null);
        }}>
        <div className="flex items-center justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-widest text-primary">Semana {week}</p><h2 className="text-lg font-extrabold">Tu rutina de entrenamiento</h2></div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{blocks.filter(b => b.items.length).length} bloques</span></div>
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">Semana {week} · Día {day}</p>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-sm text-muted-foreground">{status === "completed" ? "Sesión finalizada" : readOnly ? "Consulta de semana fuera de vigencia" : status === "in_progress" ? "Sesión en curso" : "Lista para empezar"}</p>
          </div>
          <div className="rounded-xl bg-muted px-4 py-2 text-sm font-semibold">{done} de {total} ejercicios</div>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: total ? `${done / total * 100}%` : "0%" }} /></div>
        {!readOnly && status === "not_started" && <button disabled={pending} onClick={() => run(() => startPlanSession(assignmentId, week, day))} className="w-full rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-50">Iniciar actividad</button>}
        {!readOnly && status === "in_progress" && <button disabled={pending || done !== total || total === 0} onClick={() => {
          if (dirtySeries.length && !window.confirm(`Tenés ${dirtySeries.length} serie(s) con cambios sin guardar. Si finalizás ahora, esos cambios se perderán. ¿Finalizar igualmente?`)) return;
          if (!window.confirm("¿Finalizar esta actividad? No podrás volver a editarla.")) return;
          run(() => finishPlanSession(assignmentId, week, day));
        }} className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white disabled:opacity-40">Finalizar actividad</button>}
        {!readOnly && status === "in_progress" && done !== total && <p className="text-xs text-muted-foreground">Marcá todos los ejercicios realizados para habilitar la finalización.</p>}
        {status === "completed" && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">Actividad finalizada. No se puede finalizar por segunda vez.</div>}
        {startedAt && <p className="text-xs text-muted-foreground">Inicio: {new Date(startedAt).toLocaleString("es-AR")}{finishedAt ? ` · Fin: ${new Date(finishedAt).toLocaleString("es-AR")}` : ""}</p>}
        {!readOnly && status === "in_progress" && dirtySeries.length > 0 && <p role="status" className="rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">Tenés {dirtySeries.length} serie(s) con cambios sin guardar. Guardalas antes de finalizar para conservar sus valores.</p>}
        {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">{error}</p>}
      </section>
      {blocks.filter(block => block.items.length > 0).map((block, index) => (
        <details key={index} open={index === 0 ? true : undefined} className="group min-w-0 rounded-2xl border border-border bg-card p-3 sm:p-4 space-y-3" >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-2 sm:gap-3">
            <span className="flex min-w-0 items-center gap-2 sm:gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">{index + 1}</span><span className="min-w-0"><span className="block text-sm font-bold leading-snug sm:text-base">{block.title}</span><span className="block text-xs text-muted-foreground">{block.type === "circuit" ? (() => { const cfg = block.circuitWeeks?.[week - 1]; return cfg ? `${cfg.rounds} vueltas · ${cfg.workSeconds}s trabajo · ${cfg.restSeconds}s pausa · ${block.items.length} ejercicios` : `Circuito · ${block.items.length} ejercicios`; })() : block.type === "main" && (block.strengthMode === "triserie" || block.strengthMode === "biserie") ? `${block.strengthMode === "triserie" ? "Triserie" : "Biserie"} · ${block.items.length} ejercicios en secuencia` : `Entrenamiento · ${block.items.length} ejercicios` }</span></span></span>
            <span className="shrink-0 text-[11px] font-semibold text-primary group-open:hidden sm:text-xs">Ver ejercicios +</span><span className="hidden shrink-0 text-[11px] font-semibold text-primary group-open:inline sm:text-xs">Ocultar −</span>
          </summary>
          {block.type === "main" && (block.strengthMode === "triserie" || block.strengthMode === "biserie") && (() => {
            const rounds = block.items.map(item => item.prescriptions?.[week - 1]?.sets).filter((value): value is number => typeof value === "number" && value > 0);
            const sameRounds = rounds.length === block.items.length && rounds.every(value => value === rounds[0]);
            const minRest = block.betweenSetsRestMinSeconds;
            const maxRest = block.betweenSetsRestMaxSeconds;
            return <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-4" aria-label="Secuencia de ejercicios">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-primary-foreground">{block.strengthMode === "triserie" ? "Triserie" : "Biserie"}</span>
                <span className="text-sm font-bold">{sameRounds ? `${rounds[0]} ${rounds[0] === 1 ? "vuelta" : "vueltas"} · Semana ${week}` : `Semana ${week}`}</span>
              </div>
              <p className="text-sm text-muted-foreground">Hacé estos ejercicios uno después del otro, en este orden:</p>
              <div className="rounded-xl border border-primary/30 bg-background p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-primary">Descanso al terminar la secuencia</p>
                <p className="mt-1 text-xl font-extrabold">{minRest !== undefined && maxRest !== undefined ? `${restLabel(minRest)} – ${restLabel(maxRest)}` : minRest !== undefined ? restLabel(minRest) : maxRest !== undefined ? restLabel(maxRest) : "Según indique tu entrenador"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{sameRounds ? "Repetí la secuencia hasta completar las vueltas indicadas." : "Consultá las series indicadas para cada ejercicio."}</p>
              </div>
              <p className="text-xs text-muted-foreground">Abrí los detalles de cada ejercicio para registrar cargas y consultar la técnica.</p>
            </div>;
          })()}
          {block.type === "circuit" && block.circuitWeeks?.[week - 1] && (() => {
            const config = block.circuitWeeks[week - 1];
            return <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-primary">Circuito · Semana {week}</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {[
                  ["Vueltas", String(config.rounds)],
                  ["Trabajo", config.workSeconds + " seg"],
                  ["Descanso", config.restSeconds + " seg"],
                  ["Entre vueltas", config.betweenRoundsSeconds + " seg"],
                  ["Esfuerzo", config.rpe ? config.rpe + "/10" : "—"]
                ].map(([label, value]) => <div key={label} className="rounded-lg bg-background border p-2"><p className="text-xs text-muted-foreground">{label}</p><p className="text-base font-bold">{value}</p></div>)}
              </div>
              <p className="text-xs text-muted-foreground">Realizá los ejercicios en el orden indicado y repetí el circuito durante las vueltas configuradas.</p>
            </div>;
          })()}
          {block.items.map((item, itemIndex) => {
            const p = item.prescriptions?.[week - 1] || {};
            const checked = completed.includes(item.key);
            return (
              <article key={item.key || itemIndex} className={`overflow-hidden rounded-2xl border bg-card shadow-sm transition-colors ${checked ? "border-emerald-500 dark:border-emerald-400" : "border-border"}`}>
                {item.imageVerified === true && item.imageUrl && /^https:\/\//.test(item.imageUrl) && <div className="flex h-48 w-full items-center justify-center bg-muted/30 sm:h-64 lg:h-72"><img src={item.imageUrl} alt={`Demostración de ${item.title}`} loading="lazy" className="h-full w-full object-contain" /></div>}
                <div className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap sm:p-4">
                  
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Ejercicio {itemIndex + 1}</p>
                    <h4 className="text-sm font-bold leading-snug sm:text-base">{item.title}</h4>
                    {block.type !== "circuit" && <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">{[p.sets ? `${p.sets} series` : null, p.reps ? `${p.reps} reps` : null, p.rir ? `RIR ${p.rir}` : null].filter(Boolean).map(value => <span key={value} className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-bold text-primary">{value}</span>)}</div>}
                  </div>
                  {status !== "not_started" && <label className="flex shrink-0 items-center gap-2 text-xs font-semibold cursor-pointer"><input type="checkbox" disabled={pending || readOnly || status === "completed"} checked={checked} onChange={e => {
                    const next = e.target.checked;
                    run(() => markPlanExercise(assignmentId, week, day, item.key, next), () => setCompleted(old => next ? [...old.filter(k => k !== item.key), item.key] : old.filter(k => k !== item.key)));
                  }} className="h-5 w-5 accent-emerald-600" />Hecho</label>}
                </div>
                <details className="group/exercise border-t border-border">
                  <summary className="cursor-pointer list-none px-3 py-3 text-xs font-semibold text-primary sm:px-4"><span className="group-open/exercise:hidden">Ver técnica y registrar series +</span><span className="hidden group-open/exercise:inline">Ocultar detalles −</span></summary>
                  <div className="space-y-3 px-3 pb-4 sm:px-4">
                  {block.type !== "circuit" && <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {p.sets != null && <div className="rounded-xl border border-border bg-muted/60 p-3"><p className="text-xs text-muted-foreground">Series</p><p className="text-lg font-bold">{p.sets}</p></div>}
                    {p.reps && <div className="rounded-xl bg-muted/70 p-3"><p className="text-xs text-muted-foreground">Repeticiones</p><p className="text-lg font-bold">{p.reps}</p></div>}
                    {p.durationSeconds != null && <div className="rounded-xl bg-muted/70 p-3"><p className="text-xs text-muted-foreground">Duración</p><p className="text-lg font-bold">{p.durationSeconds} seg</p></div>}
                    {p.rir && <div className="rounded-xl bg-muted/70 p-3"><p className="text-xs text-muted-foreground">RIR</p><p className="text-lg font-bold">{p.rir}</p></div>}
                    {p.restSeconds != null && <div className="rounded-xl bg-muted/70 p-3"><p className="text-xs text-muted-foreground">Descanso</p><p className="text-lg font-bold">{p.restSeconds} seg</p></div>}
                    {p.tempo && <div className="rounded-xl bg-muted/70 p-3"><p className="text-xs text-muted-foreground">Tempo</p><p className="text-lg font-bold">{p.tempo}</p></div>}
                    {p.distanceMeters != null && <div className="rounded-xl bg-muted/70 p-3"><p className="text-xs text-muted-foreground">Distancia</p><p className="text-lg font-bold">{p.distanceMeters} m</p></div>}
                  </div>}
                  {block.type !== "circuit" && status !== "not_started" && Number(p.sets) > 0 && (
                    <details className="rounded-xl border p-3">
                      <summary className="cursor-pointer text-sm font-semibold text-primary">Registrar cargas por serie (opcional)</summary>
                      <p className="mt-2 text-xs text-muted-foreground">Podés dejar todos los campos vacíos y marcar el ejercicio como hecho.</p>
                      <div className="mt-3 space-y-3">
                        {Array.from({ length: Math.min(30, Number(p.sets)) }, (_, i) => {
                          const index = i + 1;
                          const saved = sets.find((x) => x.key === item.key && x.setIndex === index);
                          return (
                            <SetEntry key={index} index={index} saved={saved} disabled={pending || readOnly || status === "completed"}
                              onDirtyChange={(dirty) => setDirtySeries((old) => dirty
                                ? old.includes(seriesId(item.key, index)) ? old : [...old, seriesId(item.key, index)]
                                : old.filter((id) => id !== seriesId(item.key, index)))}
                              onSave={async (actual) => {
                                const result = await saveActualSet(assignmentId, week, day, item.key, index, actual);
                                if (result.success) {
                                  setSets((old) => [...old.filter((x) => !(x.key === item.key && x.setIndex === index)), { key: item.key, setIndex: index, ...actual }]);
                                }
                                return result;
                              }} />
                          );
                        })}
                      </div>
                    </details>
                  )}
                  {item.instructions && <p className="text-sm leading-relaxed text-muted-foreground"><strong className="text-foreground">Cómo hacerlo:</strong> {item.instructions}</p>}
                  {p.notes && <p className="text-sm text-muted-foreground">{p.notes}</p>}
                  {(!item.imageUrl || item.imageVerified !== true) && <p className="text-xs text-muted-foreground italic">Demostración visual pendiente de verificación por el entrenador.</p>}
                  </div>
                </details>
              </article>
            );
          })}
        </details>
      ))}
      </div>
    </div>
  );
}

type Actual = { reps: number | null; load: number | null; rir: number | null };
function SetEntry({ index, saved, disabled, onSave, onDirtyChange }: {
  index: number;
  saved?: SetLog;
  disabled: boolean;
  onSave: (actual: Actual) => Promise<{ success: boolean; error?: string }>;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [reps, setReps] = useState(saved?.reps?.toString() ?? "");
  const [load, setLoad] = useState(saved?.load?.toString() ?? "");
  const [rir, setRir] = useState(saved?.rir?.toString() ?? "");
  const [baseline, setBaseline] = useState<Actual>({
    reps: saved?.reps ?? null, load: saved?.load ?? null, rir: saved?.rir ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const parse = (value: string) => value.trim() === "" ? null : Number(value);
  const current: Actual = { reps: parse(reps), load: parse(load), rir: parse(rir) };
  const dirty = current.reps !== baseline.reps || current.load !== baseline.load || current.rir !== baseline.rir;
  function change(field: "reps" | "load" | "rir", value: string) {
    const next = { ...current, [field]: parse(value) };
    if (field === "reps") setReps(value);
    if (field === "load") setLoad(value);
    if (field === "rir") setRir(value);
    setMessage("");
    setSaveError("");
    onDirtyChange(next.reps !== baseline.reps || next.load !== baseline.load || next.rir !== baseline.rir);
  }
  async function save() {
    if (!dirty || saving || disabled) return;
    setSaving(true);
    setSaveError("");
    setMessage("");
    try {
      const result = await onSave(current);
      if (result.success) {
        setBaseline(current);
        onDirtyChange(false);
        setMessage("Serie guardada correctamente");
      } else {
        setSaveError(result.error || "No se pudo guardar la serie");
      }
    } catch {
      setSaveError("Error de conexión. Los cambios siguen sin guardar.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Serie {index}</p>
        {dirty ? <span className="text-xs font-semibold text-amber-700">Cambios sin guardar</span>
          : message ? <span role="status" className="text-xs font-semibold text-emerald-700">{message}</span>
          : saved && (saved.load != null || saved.reps != null || saved.rir != null) ? <span className="text-xs text-emerald-700">Serie {index} guardada</span> : null}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs">Peso (kg)<input aria-label={`Peso serie ${index}`} type="number" min="0" max="10000" step="0.5" value={load} onChange={(e) => change("load", e.target.value)} disabled={disabled || saving} className="mt-1 w-full rounded border bg-background p-2" /></label>
        <label className="text-xs">Repeticiones<input aria-label={`Repeticiones serie ${index}`} type="number" min="0" max="1000" step="1" value={reps} onChange={(e) => change("reps", e.target.value)} disabled={disabled || saving} className="mt-1 w-full rounded border bg-background p-2" /></label>
        <label className="text-xs">RIR<input aria-label={`RIR serie ${index}`} type="number" min="0" max="30" step="0.5" value={rir} onChange={(e) => change("rir", e.target.value)} disabled={disabled || saving} className="mt-1 w-full rounded border bg-background p-2" /></label>
      </div>
      {saveError && <p role="alert" className="mt-2 text-xs text-red-600">{saveError}</p>}
      {!disabled && <button type="button" disabled={saving || !dirty} className="mt-2 rounded bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50" onClick={save}>{saving ? "Guardando..." : "Guardar serie"}</button>}
    </div>
  );
}
