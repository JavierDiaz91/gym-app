"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveTrainingPlanDraft, publishTrainingPlan, duplicateTrainingPlan, assignTrainingPlan, type PlanDraft, type PlanDay, type PlanBlock, type PlanItem, type CircuitWeek, type Prescription } from "../actions";

type Plan = { id: number; title: string; durationWeeks: number; status: string; draft: PlanDraft };
const field = "w-full rounded-lg border bg-background px-3 py-2 text-sm";
const button = "rounded-lg border px-3 py-2 text-sm disabled:opacity-50";
const suggestedSections = (): PlanBlock[] => [
  { title: "Entrada en calor", type: "warmup", items: [] },
  { title: "Entrenamiento principal", type: "main", items: [] },
  { title: "Trabajo final", type: "custom", items: [] },
];
const blank = (weeks: number): PlanItem => ({
  key: "item-" + crypto.randomUUID(), title: "", imageUrl: "", instructions: "",
  prescriptions: Array.from({ length: weeks }, () => ({ sets: 3, reps: "10", restSeconds: 60 }))
});

type ProgressScope = "all" | "main";
const numeric = (value: unknown): number | null => {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const bounded = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
function transformWeeks(draft: PlanDraft, fromWeek: number, toWeeks: number[], transform: (rx: Prescription, targetWeek: number) => Prescription, scope: ProgressScope): PlanDraft {
  return { days: draft.days.map(day => ({ ...day, blocks: day.blocks.map(block => ({
    ...block, items: block.items.map(item => {
      if (scope === "main" && block.type !== "main") return item;
      const prescriptions = [...item.prescriptions];
      const source = prescriptions[fromWeek] || {};
      for (const targetWeek of toWeeks) prescriptions[targetWeek] = transform({ ...source }, targetWeek);
      return { ...item, prescriptions };
    })
  })) })) };
}

export default function PlanEditor({ plan, members, exercises }: { plan: Plan; members: { id: number; name: string }[]; exercises: { id: number; name: string; imageUrl: string; instructions: string }[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<PlanDraft>(() => plan.status === "draft" && (!plan.draft?.days || plan.draft.days.length === 0) ? { days: [{ title: "Día 1", modality: "strength", blocks: suggestedSections() }] } : (plan.draft || { days: [] }));
  const [week, setWeek] = useState(0);
  const [selectedDay, setSelectedDay] = useState(0);
  const [memberId, setMemberId] = useState(members[0]?.id || 0);
  const [personalize, setPersonalize] = useState(false);
  const [message, setMessage] = useState("");
  const [scope, setScope] = useState<ProgressScope>("main");
  const [repIncrement, setRepIncrement] = useState(0);
  const [rirIncrement, setRirIncrement] = useState(0);
  const [deload, setDeload] = useState(false);
  const [preview, setPreview] = useState<PlanDraft | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(plan.draft || { days: [] }));
  const hasUnsavedChanges = plan.status === "draft" && JSON.stringify(draft) !== savedSnapshot;
  const [pending, start] = useTransition();
  const editable = plan.status === "draft" || personalize;
  const change = (next: PlanDraft) => setDraft(next);
  const updateDay = (di: number, fn: (day: PlanDay) => PlanDay) =>
    change({ days: draft.days.map((d, i) => i === di ? fn(d) : d) });
  const updateBlock = (di: number, bi: number, fn: (block: PlanBlock) => PlanBlock) =>
    updateDay(di, (d) => ({ ...d, blocks: d.blocks.map((b, i) => i === bi ? fn(b) : b) }));
  const updateItem = (di: number, bi: number, ii: number, fn: (item: PlanItem) => PlanItem) =>
    updateBlock(di, bi, (b) => ({ ...b, items: b.items.map((x, i) => i === ii ? fn(x) : x) }));
  const moveItem = (di: number, fromBlock: number, itemIndex: number, toBlock: number) => {
    if (fromBlock === toBlock) return;
    updateDay(di, day => {
      const blocks = day.blocks.map(block => ({ ...block, items: [...block.items] }));
      const [item] = blocks[fromBlock].items.splice(itemIndex, 1);
      if (item) blocks[toBlock].items.push(item);
      return { ...day, blocks };
    });
    setMessage("Ejercicio movido. Guardá los cambios para conservar la nueva ubicación.");
  };
  const updateRx = (di: number, bi: number, ii: number, patch: Partial<Prescription>) =>
    updateItem(di, bi, ii, (x) => ({ ...x, prescriptions: x.prescriptions.map((p, i) => i === week ? { ...p, ...patch } : p) }));
  const updateCircuit = (di: number, bi: number, patch: Partial<CircuitWeek>) =>
    updateBlock(di, bi, (block) => {
      const defaults: CircuitWeek = { rounds: 4, workSeconds: 25, restSeconds: 15, betweenRoundsSeconds: 180, rpe: 9 };
      const circuitWeeks = Array.from({ length: plan.durationWeeks }, (_, i) =>
        i === week ? { ...defaults, ...(block.circuitWeeks?.[i] || {}), ...patch } : (block.circuitWeeks?.[i] || defaults));
      return { ...block, circuitWeeks };
    });
  const copyDayWeek = (di: number) => {
    const day = draft.days[di];
    if (!day || plan.durationWeeks < 2) return;
    const targets = Array.from({ length: plan.durationWeeks }, (_, i) => i).filter(i => i !== week);
    const items = day.blocks.flatMap(block => block.items);
    if (!items.length) { setMessage("Primero agregá ejercicios al día para copiar sus valores."); return; }
    const changed = items.some(item => targets.some(i =>
      JSON.stringify(item.prescriptions[i] || {}) !== JSON.stringify(item.prescriptions[week] || {})
    ));
    const message = changed
      ? `¿Copiar los valores de todos los ejercicios del día ${di + 1}, semana ${week + 1}, a las demás semanas? Se reemplazarán los valores personalizados de esas semanas.`
      : `¿Copiar los valores de todos los ejercicios del día ${di + 1}, semana ${week + 1}, a las demás semanas?`;
    if (!window.confirm(message)) return;
    updateDay(di, current => ({ ...current, blocks: current.blocks.map(block => ({
      ...block,
      items: block.items.map(item => ({
        ...item,
        prescriptions: Array.from({ length: plan.durationWeeks }, (_, i) =>
          i === week ? (item.prescriptions[i] || {}) : { ...(item.prescriptions[week] || {}) }
        ),
      })),
      circuitWeeks: block.circuitWeeks?.map((cw, i) =>
        i === week ? cw : { ...(block.circuitWeeks?.[week] || cw) }
      ),
    })) }));
    setMessage(`Día ${di + 1}: valores de la semana ${week + 1} copiados a las demás. Guardá los cambios.`);
  };
  const copyPrevious = () => {
    if (week < 1) return;
    if (!window.confirm("¿Copiar los parámetros de la semana " + week + " a la semana " + (week + 1) + "? Se reemplazarán los parámetros actuales de los ejercicios seleccionados.")) return;
    change(transformWeeks(draft, week - 1, [week], (rx) => ({ ...rx }), scope));
    setPreview(null);
    setMessage("Parámetros copiados. Presioná Guardar borrador para persistirlos.");
  };
  const makeProgression = () => transformWeeks(draft, 0, Array.from({ length: plan.durationWeeks - 1 }, (_, i) => i + 1), (rx, targetWeek) => {
    const isDeload = deload && targetWeek === plan.durationWeeks - 1 && plan.durationWeeks > 2;
    const result = { ...rx };
    const reps = numeric(rx.reps);
    const rir = numeric(rx.rir);
    if (reps !== null) result.reps = String(Math.max(1, Math.round(reps + (isDeload ? 0 : targetWeek * repIncrement))));
    if (rir !== null) result.rir = String(bounded(rir + (isDeload ? 1 : targetWeek * rirIncrement), 0, 10));
    if (isDeload && numeric(rx.sets) !== null) result.sets = Math.max(1, Math.round(Number(rx.sets) * 0.7));
    return result;
  }, scope);
  const applyProgression = () => {
    if (!preview) return;
    if (!window.confirm("¿Aplicar la progresión a las semanas 2 a " + plan.durationWeeks + "? Se reemplazarán los parámetros existentes del alcance seleccionado.")) return;
    change(preview);
    setPreview(null);
    setMessage("Progresión aplicada localmente. Revisá las semanas y presioná Guardar borrador.");
  };
  function run(fn: () => Promise<{ success: boolean; error?: string; id?: number }>, onSuccess?: (id?: number) => void, successMessage = "Operación completada") {
    setMessage(""); start(async () => {
      const result = await fn();
      setMessage(result.success ? successMessage : result.error || "Error");
      if (result.success) { onSuccess?.(result.id); router.refresh(); }
    });
  }
  const saveDraft = () => {
    const snapshot = JSON.stringify(draft);
    run(() => saveTrainingPlanDraft(plan.id, draft), () => setSavedSnapshot(snapshot));
  };
  const saveAndPublish = () => {
    if (!window.confirm("¿Finalizar la rutina para poder asignarla a tus alumnos?")) return;
    run(async () => {
      const saved = await saveTrainingPlanDraft(plan.id, draft);
      return saved.success ? publishTrainingPlan(plan.id) : saved;
    }, () => router.refresh());
  };
  return <main className="mx-auto max-w-6xl space-y-5 p-4 md:p-8 text-foreground">
    <Link href="/trainer/rutinas/planes" className="text-sm text-primary">← Volver a mis rutinas</Link>
    <div className="flex flex-wrap justify-between gap-3">
      <div><h1 className="text-2xl font-bold">{plan.title}</h1><p className="text-sm text-muted-foreground">{plan.durationWeeks} semanas · {plan.status === "draft" ? "Borrador" : "Publicado"}{plan.status === "published" && personalize ? " · Personalización para alumno (sin modificar plantilla)" : ""}</p></div>
      <div className="flex flex-wrap gap-2">
        <button className={button} disabled={pending} onClick={() => run(() => duplicateTrainingPlan(plan.id), (id) => id && router.push("/trainer/rutinas/planes/" + id))}>Duplicar rutina</button>

      </div>
    </div>
    {plan.status === "draft" && <div className="sticky top-2 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-background/95 p-3 shadow-md backdrop-blur dark:border-slate-700" role="region" aria-label="Acciones de la rutina">
      <span className="text-sm font-medium" role="status" aria-live="polite">{pending ? "Guardando..." : hasUnsavedChanges ? "● Cambios sin guardar" : "✓ Cambios guardados"}</span>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} disabled={pending || !hasUnsavedChanges} onClick={saveDraft}>{pending ? "Guardando..." : "Guardar cambios"}</button>
        <button type="button" className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-black disabled:opacity-50" disabled={pending} onClick={saveAndPublish}>Guardar y finalizar rutina</button>
      </div>
    </div>}
    {plan.status === "published" && <a href="#asignar-alumno" className="inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-bold text-slate-950">Continuar: asignar a un alumno ↓</a>}
    {plan.status === "published" && <p className="rounded-lg border p-3 text-sm text-muted-foreground">Esta rutina ya está lista para asignar. Si querés modificarla, duplicala; también podés personalizarla para un alumno sin alterar la original.</p>}
    {message && <p role="status" className="rounded-lg border p-3 text-sm">{message}</p>}
    <section className="space-y-3 rounded-2xl border border-slate-300 bg-muted/10 p-4 dark:border-slate-700" aria-label="Seleccionar semana y día">
      <div className="space-y-1"><h2 className="text-lg font-bold">Organizá tu rutina</h2><p className="text-sm text-muted-foreground">Elegí un día, poné nombre a cada sección y agregá sus ejercicios. Podés copiar los valores a las demás semanas.</p></div>
      <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm font-semibold">Semana de entrenamiento:</span>
      {Array.from({ length: plan.durationWeeks }, (_, i) => <button key={i} type="button" className={button + (week === i ? " border-primary text-primary" : "")} onClick={() => setWeek(i)}>{i + 1}</button>)}
    </div>
    {editable && <details className="rounded-xl border border-slate-300 bg-muted/10 p-4 dark:border-slate-700" aria-label="Progresión semanal avanzada">
      <summary className="cursor-pointer list-item text-sm font-semibold">Progresión entre semanas (opcional) <span className="ml-2 font-normal text-muted-foreground">· Sin aumentos automáticos por defecto</span></summary>
      <div className="mt-4 space-y-3">
      <h2 className="font-semibold">Automatización semanal</h2>
      <p className="text-sm text-muted-foreground">Las semanas mantienen parámetros independientes. Los cambios se guardan al presionar Guardar borrador.</p>
      <label className="block text-sm">Aplicar a
        <select className={field} value={scope} onChange={(e) => { setScope(e.target.value as ProgressScope); setPreview(null); }}>
          <option value="main">Solo bloques principales (recomendado)</option>
          <option value="all">Todos los ejercicios e intervalos</option>
        </select>
      </label>
      <button type="button" className={button} disabled={week === 0 || pending} onClick={copyPrevious}>Copiar semana anterior a semana {week + 1}</button>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-sm">Aumentar repeticiones por semana (0 = mantener)
          <input type="number" className={field} step={1} min={-20} max={20} value={repIncrement} onChange={e => { setRepIncrement(bounded(Number(e.target.value) || 0, -20, 20)); setPreview(null); }} />
        </label>
        <label className="text-sm">Cambio de RIR por semana (0 = mantener)
          <input type="number" className={field} step={1} min={-5} max={5} value={rirIncrement} onChange={e => { setRirIncrement(bounded(Number(e.target.value) || 0, -5, 5)); setPreview(null); }} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={deload} onChange={e => { setDeload(e.target.checked); setPreview(null); }} />Última semana de descarga (series -30%, RIR +1 respecto de semana 1)</label>
      <p className="text-xs text-muted-foreground">La progresión parte de la Semana 1. Ajusta repeticiones numéricas y RIR; conserva tiempos, distancias y descansos.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} disabled={pending || plan.durationWeeks < 2} onClick={() => setPreview(makeProgression())}>Vista previa de progresión</button>
        {preview && <button type="button" className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-black" onClick={applyProgression}>Aplicar progresión</button>}
        {preview && <button type="button" className={button} onClick={() => setPreview(null)}>Cancelar</button>}
      </div>
      {preview && <div className="max-h-80 overflow-auto rounded-lg border p-3 text-sm">
        <p className="font-semibold mb-2">Vista previa (sin guardar)</p>
        {preview.days.map((day, di) => <div key={di} className="mb-3">
          <p className="font-medium">{day.title}</p>
          {day.blocks.filter(block => scope === "all" || block.type === "main").flatMap(block => block.items).map(item => <div key={item.key} className="border-b py-1">
            <span>{item.title}: </span>
            {item.prescriptions.map((rx, wi) => <span key={wi} className="mr-2 whitespace-nowrap">S{wi + 1}: {rx.sets ?? "—"}×{rx.reps ?? "—"} · RIR {rx.rir ?? "—"}</span>)}
          </div>)}
        </div>)}
      </div>}
      </div>
    </details>}
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-bold">Días de entrenamiento</h2>{editable && <button type="button" className={button} disabled={draft.days.length >= 7} onClick={() => { setSelectedDay(draft.days.length); change({ days: [...draft.days, { title: "Día " + (draft.days.length + 1), modality: "strength", blocks: [] }] }); }}>+ Agregar día</button>}</div>
    {draft.days.length === 0 ? (
      <div role="status" className="rounded-xl border border-dashed border-slate-500/60 bg-slate-900/20 px-5 py-8 text-center dark:bg-slate-900/30">
        <p className="text-base font-semibold">Todavía no agregaste días de entrenamiento</p>
        <p className="mt-2 text-sm text-muted-foreground">Agregá un día para organizar los ejercicios de esta planificación.</p>
        {editable && <button type="button" className={button + " mt-4 border-primary/60 text-primary dark:text-primary"} onClick={() => { setSelectedDay(0); change({ days: [{ title: "Día 1", modality: "strength", blocks: suggestedSections() }] }); }}>+ Crear primer día</button>}
      </div>
    ) : <nav aria-label="Seleccionar día de entrenamiento" className="flex flex-wrap gap-2 rounded-xl border border-slate-300 p-3 dark:border-slate-700">
      {draft.days.map((day, di) => <button type="button" key={di} onClick={() => setSelectedDay(di)} aria-current={selectedDay === di ? "step" : undefined} className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${selectedDay === di ? "border-primary bg-primary/10 text-primary dark:text-primary" : "border-slate-300 hover:bg-muted dark:border-slate-600"}`}>{day.title.trim() === `Día ${di + 1}` ? day.title : `Día ${di + 1} · ${day.title}`}</button>)}
    </nav>}
    </section>
    {draft.days.map((day, di) => selectedDay !== di ? null : <section key={di} className="rounded-2xl border border-slate-300 bg-muted/5 p-4 space-y-3 dark:border-slate-700">
      <div className="flex flex-wrap gap-2 items-center">
        <input aria-label="Nombre del día" className={field + " max-w-sm font-semibold"} disabled={!editable} value={day.title} onChange={(e) => updateDay(di, (d) => ({ ...d, title: e.target.value }))}/>
        {editable && <button className={button} onClick={() => change({ days: draft.days.filter((_, i) => i !== di) })}>Eliminar día</button>}
      </div>
      {editable && plan.durationWeeks > 1 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
        <div><p className="text-sm font-semibold">Semana {week + 1} de {plan.durationWeeks}</p><p className="text-xs text-muted-foreground">Configurá los ejercicios una vez y aplicá sus valores a las demás semanas. No se duplican ejercicios; después podés ajustar cada semana.</p></div>
        <button type="button" className={button + " border-primary/60 font-semibold text-primary"} onClick={() => copyDayWeek(di)}>Aplicar configuración a las demás semanas</button>
      </div>}
      <div className="space-y-1"><h3 className="text-base font-bold">Secciones del día</h3><p className="text-xs text-muted-foreground">Poné el título que prefieras a cada sección (por ejemplo, Entrada en calor, Principal o Abdominales) y agregá ejercicios dentro.</p></div>
      {day.blocks.map((block, bi) => <details key={bi} open={undefined} className="group rounded-xl border border-slate-300 bg-muted/20 p-3 dark:border-slate-700">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-1">
          <span className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{bi + 1}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{block.title || "Sección sin nombre"}</span><span className="block text-xs text-muted-foreground">{"Ejercicios del día"} · {block.items.length} {block.items.length === 1 ? "ejercicio" : "ejercicios"}{block.items.length === 0 ? " · Pendiente" : ""}</span></span></span>
          <span className="shrink-0 text-xs font-semibold text-primary group-open:hidden">Abrir y agregar ejercicios +</span><span className="hidden shrink-0 text-xs font-semibold text-primary group-open:inline">Cerrar sección −</span>
        </summary>
        <div className="mt-3 space-y-3 border-t border-slate-200 pt-3 dark:border-slate-700">
        <div className="flex flex-wrap items-end gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
          <label className="text-xs text-muted-foreground">Título de la sección<input aria-label="Título de la sección" className={field + " mt-1 max-w-sm"} disabled={!editable} value={block.title} onChange={(e) => updateBlock(di, bi, (b) => ({ ...b, title: e.target.value }))}/></label>
          <details className="rounded-lg border border-slate-700/40 p-2"><summary className="cursor-pointer text-xs text-muted-foreground">Opciones de sección (tipo y ejecución)</summary><label className="mt-2 block text-xs text-muted-foreground">Tipo de entrenamiento<select aria-label="Tipo de bloque" disabled={!editable} className={field + " max-w-44"} value={block.type} onChange={(e) => updateBlock(di, bi, (b) => ({ ...b, type: e.target.value as PlanBlock["type"] }))}>
            {["warmup","main","circuit","cooldown","custom"].map((x) => <option key={x} value={x}>{({warmup:"Entrada en calor",main:"Principal",circuit:"Circuito",cooldown:"Vuelta a la calma",custom:"Otro"} as Record<string,string>)[x]}</option>)}
          </select></label></details>
          {editable && <button className={button + " text-rose-400"} onClick={() => { if (window.confirm("¿Eliminar este bloque y todos sus ejercicios?")) updateDay(di, (d) => ({ ...d, blocks: d.blocks.filter((_, i) => i !== bi) })); }}>Eliminar sección</button>}
        </div>
        {block.type === "main" && <details className="rounded-xl border border-primary/30 bg-primary/5 p-3"><summary className="cursor-pointer text-sm font-medium">Opciones avanzadas: biseries y triseries</summary><div className="mt-3 space-y-3">
          <div><h3 className="text-sm font-semibold">Cómo se ejecuta este bloque</h3><p className="text-xs text-muted-foreground">Agrupá los ejercicios y definí el descanso al terminar cada vuelta. No modifica las series, repeticiones ni RIR que ya cargaste.</p></div>
          <label className="block max-w-xs text-xs font-medium">Modalidad del bloque
            <select className={field + " mt-1"} disabled={!editable} value={block.strengthMode || "individual"} onChange={e => updateBlock(di, bi, b => ({ ...b, strengthMode: e.target.value as NonNullable<PlanBlock["strengthMode"]> }))}>
              <option value="individual">Ejercicios individuales</option>
              <option value="biserie">Biserie · 2 ejercicios seguidos</option>
              <option value="triserie">Triserie · 3 ejercicios seguidos</option>
            </select>
          </label>
          {(block.strengthMode === "biserie" || block.strengthMode === "triserie") && <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium">Descanso mínimo entre vueltas (seg)
                <input type="number" min={0} max={7200} step={1} className={field + " mt-1"} disabled={!editable} value={block.betweenSetsRestMinSeconds ?? ""} placeholder="Ej. 180" onChange={e => updateBlock(di, bi, b => ({ ...b, betweenSetsRestMinSeconds: e.target.value === "" ? undefined : Number(e.target.value) }))}/>
              </label>
              <label className="text-xs font-medium">Descanso máximo entre vueltas (seg)
                <input type="number" min={0} max={7200} step={1} className={field + " mt-1"} disabled={!editable} value={block.betweenSetsRestMaxSeconds ?? ""} placeholder="Ej. 300" onChange={e => updateBlock(di, bi, b => ({ ...b, betweenSetsRestMaxSeconds: e.target.value === "" ? undefined : Number(e.target.value) }))}/>
              </label>
            </div>
            <div className="rounded-lg border border-primary/20 bg-background/70 p-3 text-sm">
              <p className="font-semibold">{block.strengthMode === "triserie" ? "Triserie" : "Biserie"} · Orden de ejecución</p>
              <ol className="mt-2 list-inside list-decimal space-y-1">{block.items.map(item => <li key={item.key}>{item.title || "Ejercicio sin nombre"}</li>)}</ol>
              <p className="mt-2 text-xs font-medium text-primary">Al terminar la secuencia: descansar {block.betweenSetsRestMinSeconds !== undefined ? block.betweenSetsRestMinSeconds + " a " : ""}{block.betweenSetsRestMaxSeconds !== undefined ? block.betweenSetsRestMaxSeconds : "—"} segundos y repetir según las series de la semana.</p>
              {block.items.length !== (block.strengthMode === "triserie" ? 3 : 2) && <p className="mt-2 text-xs text-amber-500">Revisá la cantidad de ejercicios: esta modalidad requiere {block.strengthMode === "triserie" ? 3 : 2}.</p>}
            </div>
          </>}
        </div></details>}
        {block.type === "circuit" && <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div><h3 className="font-semibold text-sm">Configuración del circuito · Semana {week + 1}</h3><p className="text-xs text-muted-foreground">Los valores se aplican a todos los ejercicios de este bloque. Cada semana tiene su propia configuración.</p></div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {([
              ["rounds", "Vueltas", 1, 100],
              ["workSeconds", "Trabajo (seg)", 1, 3600],
              ["restSeconds", "Pausa (seg)", 0, 3600],
              ["betweenRoundsSeconds", "Entre vueltas (seg)", 0, 7200],
              ["rpe", "Esfuerzo RPE", 1, 10]
            ] as const).map(([key, label, min, max]) => {
              const defaults: CircuitWeek = { rounds: 4, workSeconds: 25, restSeconds: 15, betweenRoundsSeconds: 180, rpe: 9 };
              return <label key={key} className="text-xs font-medium">{label}
                <input type="number" min={min} max={max} step={1} disabled={!editable} className={field + " mt-1"} value={block.circuitWeeks?.[week]?.[key] ?? defaults[key]}
                  onChange={(e) => { const value = Number(e.target.value); if (e.target.value !== "" && Number.isInteger(value) && value >= min && value <= max) updateCircuit(di, bi, { [key]: value }); }}/>
              </label>;
            })}
          </div>
          {editable && plan.durationWeeks > 1 && <button type="button" className={button + " text-xs"} onClick={() => {
            if (!window.confirm("¿Copiar los tiempos y vueltas de la semana " + (week + 1) + " a las demás semanas de este circuito? Se reemplazarán sus valores actuales.")) return;
            updateBlock(di, bi, b => {
              const defaults: CircuitWeek = { rounds: 4, workSeconds: 25, restSeconds: 15, betweenRoundsSeconds: 180, rpe: 9 };
              const source = { ...defaults, ...(b.circuitWeeks?.[week] || {}) };
              return { ...b, circuitWeeks: Array.from({ length: plan.durationWeeks }, () => ({ ...source })) };
            });
          }}>Copiar configuración a las demás semanas</button>}
          <p className="text-xs text-muted-foreground">Agregá los ejercicios debajo en el orden de ejecución. Guardá los cambios para conservar la configuración.</p>
        </div>}
        {block.items.length === 0 && <p className="rounded-lg border border-dashed border-primary/30 p-3 text-xs text-muted-foreground">Esta sección está vacía. Agregá el primer ejercicio con el botón de abajo.</p>}
        {block.items.map((item, ii) => { const rx = item.prescriptions[week] || {}; return <details key={item.key} className="group relative rounded-xl border border-slate-300 bg-background p-2.5 shadow-sm dark:border-slate-700">
          <summary className="flex min-w-0 cursor-pointer list-none items-center gap-3 pr-20">
            {item.imageUrl ? <img src={item.imageUrl} alt={"Demostración de " + item.title} className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 bg-slate-100 object-contain dark:border-slate-700" /> : <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] text-muted-foreground">Sin imagen</span>}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{ii + 1}. {item.title || "Ejercicio sin nombre"}</span>
              <span className="block truncate text-xs text-muted-foreground">{block.type === "circuit" ? "Circuito · configuración por tiempo" : [
                rx.sets !== undefined ? rx.sets + " series" : null,
                rx.reps ? "× " + rx.reps + " rep." : null,
                rx.restSeconds !== undefined ? rx.restSeconds + " s descanso" : null,
                rx.rir !== undefined && rx.rir !== "" ? "RIR " + rx.rir : null,
              ].filter(Boolean).join(" · ") || "Sin parámetros"}{item.instructions ? " · Con indicaciones" : ""}</span>
            </span>
            <span className="shrink-0 text-xs font-semibold text-primary group-open:hidden">Editar +</span>
            <span className="hidden shrink-0 text-xs font-semibold text-primary group-open:inline">Cerrar −</span>
          </summary>
          {editable && <div className="absolute right-3 top-5 flex shrink-0 items-center gap-1" aria-label="Ordenar ejercicios">
            <button type="button" aria-label={"Subir " + (item.title || "ejercicio")} title="Subir ejercicio" disabled={ii === 0} className={button + " disabled:cursor-not-allowed disabled:opacity-30"} onClick={() => updateBlock(di, bi, b => { const items = [...b.items]; [items[ii - 1], items[ii]] = [items[ii], items[ii - 1]]; return { ...b, items }; })}>↑</button>
            <button type="button" aria-label={"Bajar " + (item.title || "ejercicio")} title="Bajar ejercicio" disabled={ii === block.items.length - 1} className={button + " disabled:cursor-not-allowed disabled:opacity-30"} onClick={() => updateBlock(di, bi, b => { const items = [...b.items]; [items[ii], items[ii + 1]] = [items[ii + 1], items[ii]]; return { ...b, items }; })}>↓</button>
          </div>}
          <div className="mt-3 space-y-3 border-t border-slate-200 pt-3 dark:border-slate-700">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-primary">Ejercicio {ii + 1} · Semana {week + 1}</p>
            {editable && <button type="button" className="text-xs text-rose-400 hover:underline" onClick={() => updateBlock(di, bi, (b) => ({ ...b, items: b.items.filter((_, i) => i !== ii) }))}>Quitar ejercicio</button>}
          </div>
          {editable && day.blocks.length > 1 && <label className="block text-xs font-medium text-muted-foreground">Mover ejercicio a otro bloque
            <select aria-label={"Mover " + (item.title || "ejercicio") + " a otro bloque"} className={field + " mt-1"} value={bi} onChange={e => moveItem(di, bi, ii, Number(e.target.value))}>
              {day.blocks.map((target, targetIndex) => <option key={targetIndex} value={targetIndex}>{targetIndex + 1}. {target.title || "Bloque sin nombre"}{targetIndex === bi ? " (actual)" : ""}</option>)}
            </select>
          </label>}
          <div className="grid gap-2 sm:grid-cols-4">
            <label className="text-xs font-medium text-muted-foreground sm:col-span-4">Nombre del ejercicio
              <input list={`exercise-catalog-${di}-${bi}-${ii}`} className={field + " mt-1"} disabled={!editable} placeholder="Buscar o escribir ejercicio" value={item.title} onChange={(e) => {
                const name = e.target.value;
                const ex = exercises.find(x => x.name.toLocaleLowerCase() === name.toLocaleLowerCase());
                updateItem(di, bi, ii, current => ({ ...current, title: name, imageUrl: ex?.imageUrl ?? current.imageUrl, instructions: ex?.instructions ?? current.instructions }));
              }}/>
              <datalist id={`exercise-catalog-${di}-${bi}-${ii}`}>{exercises.map(ex => <option key={ex.id} value={ex.name}/>)}</datalist>
            </label>
            {block.type !== "circuit" && <>
            <label className="text-xs font-medium text-muted-foreground">Series
              <input aria-label="Series" type="number" min={0} className={field + " mt-1"} disabled={!editable} value={rx.sets ?? ""} onChange={e => updateRx(di,bi,ii,{sets:e.target.value === "" ? undefined : Number(e.target.value)})}/>
            </label>
            <label className="text-xs font-medium text-muted-foreground">Repeticiones
              <input aria-label="Repeticiones" className={field + " mt-1"} disabled={!editable} value={rx.reps ?? ""} onChange={e => updateRx(di,bi,ii,{reps:e.target.value})}/>
            </label>
            <label className="text-xs font-medium text-muted-foreground">Descanso (seg)
              <input aria-label="Pausa en segundos" type="number" min={0} className={field + " mt-1"} disabled={!editable} value={rx.restSeconds ?? ""} onChange={e => updateRx(di,bi,ii,{restSeconds:e.target.value === "" ? undefined : Number(e.target.value)})}/>
            </label>
            <label className="text-xs font-medium text-muted-foreground">RIR (opcional)
              <input aria-label="RIR" className={field + " mt-1"} disabled={!editable} placeholder="Ej.: 2" value={rx.rir ?? ""} onChange={e => updateRx(di,bi,ii,{rir:e.target.value})}/>
            </label>
            </>}
          </div>
          <details className="rounded-lg border border-slate-300 bg-muted/10 p-3 dark:border-slate-700">
            <summary className="cursor-pointer text-sm font-semibold text-cyan-700 dark:text-primary">Indicaciones e imagen (opcional)</summary>
            <div className="mt-3">
          <div className="flex flex-wrap gap-2 items-start">
            <div className="flex-1 space-y-2">

              <select aria-label="Seleccionar ejercicio del catálogo" className={field} disabled={!editable} value="" onChange={(e) => { const ex = exercises.find((x) => x.id === Number(e.target.value)); if (!ex) return; updateItem(di, bi, ii, (current) => ({ ...current, title: ex.name, imageUrl: ex.imageUrl, instructions: ex.instructions, prescriptions: current.prescriptions })); setPreview(null); setMessage("Ejercicio seleccionado. Se conservaron las cargas de todas las semanas; guardá el borrador para confirmar el cambio."); }}>
                <option value="">Elegir de Mis Ejercicios (biblioteca personal)</option>
                {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
              </select>
              <Link href="/trainer/ejercicios" className="inline-block text-xs font-semibold text-primary underline dark:text-primary">+ Crear o administrar mis ejercicios</Link>
              <details className="rounded-lg border border-slate-300 bg-background p-2 dark:border-slate-700">
                <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">Opciones avanzadas de imagen</summary>
                <label className="mt-2 block text-xs text-muted-foreground">Dirección de la imagen (URL)
                  <input aria-label="URL de imagen" placeholder="https://... imagen demostrativa" className={field + " mt-1"} disabled={!editable} value={item.imageUrl || ""} onChange={(e) => updateItem(di, bi, ii, (x) => ({ ...x, imageUrl: e.target.value }))}/>
                </label>
              </details>
              <textarea aria-label="Instrucciones" placeholder="Indicaciones técnicas" className={field} disabled={!editable} value={item.instructions || ""} onChange={(e) => updateItem(di, bi, ii, (x) => ({ ...x, instructions: e.target.value }))}/>
            </div>
          </div>
            </div>
          </details>
          {block.type !== "circuit" && <details className="rounded-lg border border-slate-300 bg-muted/10 p-3 dark:border-slate-700">
            <summary className="cursor-pointer text-sm font-semibold">Ajustar series, repeticiones y RIR por semana <span className="font-normal text-muted-foreground">· Opcional</span></summary>
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">Cada columna corresponde a una semana. Podés cambiar series, repeticiones, RIR y descanso sin modificar las otras semanas. Guardá los cambios al terminar.</p>
            <div className="overflow-x-auto rounded-xl border border-slate-300 bg-background dark:border-slate-700">
              <table className="w-full min-w-[600px] border-collapse text-left text-xs sm:text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr><th scope="col" className="sticky left-0 z-10 bg-slate-100 p-3 font-semibold dark:bg-slate-800">Parámetro</th>{Array.from({ length: plan.durationWeeks }, (_, wi) => <th scope="col" key={wi} className={`p-3 text-center font-semibold ${wi === week ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200" : ""}`}>Semana {wi + 1}</th>)}</tr>
                </thead>
                <tbody>
                  {([["sets","Series"],["reps","Repeticiones"],["rir","RIR"],["restSeconds","Descanso (seg)"],["tempo","Tempo"],["distanceMeters","Distancia (m)"],["durationSeconds","Duración (seg)"],["pace","Ritmo"]] as const).map(([key, label]) => {
                    const show = ["sets","reps","rir","restSeconds"].includes(key) || item.prescriptions.some(p => p[key] !== undefined && p[key] !== null && String(p[key]).trim() !== "");
                    if (!show) return null;
                    const isNumeric = ["sets","restSeconds","distanceMeters","durationSeconds"].includes(key);
                    return <tr key={key} className="border-t border-slate-200 dark:border-slate-700">
                      <th scope="row" className="sticky left-0 z-10 bg-background p-3 font-medium">{label}</th>
                      {Array.from({ length: plan.durationWeeks }, (_, wi) => <td key={wi} className={`p-1.5 ${wi === week ? "bg-cyan-50 dark:bg-cyan-950/40" : ""}`}>
                        <input aria-label={`${label}, semana ${wi + 1}, ${item.title || "ejercicio"}`} className="w-full min-w-20 rounded-md border border-slate-300 bg-background px-2 py-2 text-center text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-70 dark:border-slate-600" disabled={!editable} type={isNumeric ? "number" : "text"} min={isNumeric ? 0 : undefined} value={item.prescriptions[wi]?.[key] ?? ""} onChange={(e) => {
                          const value = isNumeric ? (e.target.value === "" ? undefined : Number(e.target.value)) : e.target.value;
                          updateItem(di, bi, ii, (current) => ({ ...current, prescriptions: Array.from({ length: plan.durationWeeks }, (_, index) => index === wi ? { ...(current.prescriptions[index] || {}), [key]: value } : (current.prescriptions[index] || {})) }));
                        }}/>
                      </td>)}
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            <details className="rounded-lg border border-slate-300 p-3 dark:border-slate-700">
              <summary className="cursor-pointer text-sm font-medium">Notas por semana</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {Array.from({ length: plan.durationWeeks }, (_, wi) => <label key={wi} className="space-y-1 text-xs font-medium">Semana {wi + 1}
                  <textarea className={field} disabled={!editable} rows={2} value={item.prescriptions[wi]?.notes || ""} placeholder="Observaciones para esta semana" onChange={(e) => updateItem(di, bi, ii, (current) => ({ ...current, prescriptions: Array.from({ length: plan.durationWeeks }, (_, index) => index === wi ? { ...(current.prescriptions[index] || {}), notes: e.target.value } : (current.prescriptions[index] || {})) }))}/>
                </label>)}
              </div>
            </details>
          </div>
          </details>}
          </div>
        </details>; })}
        {editable && <div className="flex flex-wrap gap-2 items-center">
          <button type="button" className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-black disabled:opacity-50" onClick={() => updateBlock(di, bi, (b) => ({ ...b, items: [...b.items, blank(plan.durationWeeks)] }))}>+ Agregar ejercicio</button>
          {exercises.length > 0 && <select aria-label="Agregar ejercicio desde mi biblioteca" className={field + " max-w-xs"} value="" onChange={(e) => {
            const ex = exercises.find(x => x.id === Number(e.target.value));
            if (!ex) return;
            updateBlock(di, bi, b => ({ ...b, items: [...b.items, { ...blank(plan.durationWeeks), title: ex.name, imageUrl: ex.imageUrl, instructions: ex.instructions }] }));
          }}>
            <option value="">+ Desde Mis Ejercicios...</option>
            {exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
          </select>}
        </div>}
        </div>
      </details>)}
      {editable && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-primary/40 p-3">
        <button type="button" className="rounded-lg border border-primary/60 px-3 py-2 text-sm font-semibold text-primary" onClick={() => updateDay(di, d => ({ ...d, blocks: [...d.blocks, { title: "Nueva sección", type: "custom", items: [] }] }))}>+ Agregar otra sección</button>
        <span className="text-xs text-muted-foreground">Podés cambiarle el nombre y agregar ejercicios. Las secciones sugeridas son opcionales.</span>
      </div>}
    </section>)}
    {plan.status === "published" && <section id="asignar-alumno" className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-primary">Paso 3 de 3</p><h2 className="text-lg font-bold">Asignar a alumnos</h2>
      <p className="text-sm text-muted-foreground">Elegí el alumno que va a recibir esta rutina. La asignación no modifica la rutina original.</p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={personalize} onChange={(e) => { setPersonalize(e.target.checked); setDraft(structuredClone(plan.draft)); }}/> Personalizar ejercicios y cargas para este alumno antes de asignar</label>
      <select aria-label="Alumno" className={field} value={memberId} onChange={(e) => setMemberId(Number(e.target.value))}>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
      <button className={button} disabled={pending || !memberId} onClick={() => run(() => assignTrainingPlan(plan.id, memberId, personalize ? draft : undefined), undefined, `Rutina asignada correctamente a ${members.find(m => m.id === memberId)?.name || "este alumno"}.`)}>Confirmar asignación</button>
    </section>}
  </main>;
}
