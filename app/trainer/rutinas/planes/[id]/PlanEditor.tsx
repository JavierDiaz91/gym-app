"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveTrainingPlanDraft, publishTrainingPlan, duplicateTrainingPlan, assignTrainingPlan, type PlanDraft, type PlanDay, type PlanBlock, type PlanItem, type Prescription } from "../actions";

type Plan = { id: number; title: string; durationWeeks: number; status: string; draft: PlanDraft };
const field = "w-full rounded-lg border bg-background px-3 py-2 text-sm";
const button = "rounded-lg border px-3 py-2 text-sm disabled:opacity-50";
const blank = (weeks: number): PlanItem => ({
  key: "item-" + crypto.randomUUID(), title: "", imageUrl: "", instructions: "",
  prescriptions: Array.from({ length: weeks }, () => ({ sets: 3, reps: "10", rir: "2", restSeconds: 60 }))
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
  const [draft, setDraft] = useState<PlanDraft>(plan.draft || { days: [] });
  const [week, setWeek] = useState(0);
  const [selectedDay, setSelectedDay] = useState(0);
  const [memberId, setMemberId] = useState(members[0]?.id || 0);
  const [personalize, setPersonalize] = useState(false);
  const [message, setMessage] = useState("");
  const [scope, setScope] = useState<ProgressScope>("main");
  const [repIncrement, setRepIncrement] = useState(2);
  const [rirIncrement, setRirIncrement] = useState(-1);
  const [deload, setDeload] = useState(true);
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
  const updateRx = (di: number, bi: number, ii: number, patch: Partial<Prescription>) =>
    updateItem(di, bi, ii, (x) => ({ ...x, prescriptions: x.prescriptions.map((p, i) => i === week ? { ...p, ...patch } : p) }));
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
  function run(fn: () => Promise<{ success: boolean; error?: string; id?: number }>, onSuccess?: (id?: number) => void) {
    setMessage(""); start(async () => {
      const result = await fn();
      setMessage(result.success ? "Operación completada" : result.error || "Error");
      if (result.success) { onSuccess?.(result.id); router.refresh(); }
    });
  }
  const saveDraft = () => {
    const snapshot = JSON.stringify(draft);
    run(() => saveTrainingPlanDraft(plan.id, draft), () => setSavedSnapshot(snapshot));
  };
  const saveAndPublish = () => {
    if (!window.confirm("¿Guardar los cambios y publicar esta plantilla?")) return;
    run(async () => {
      const saved = await saveTrainingPlanDraft(plan.id, draft);
      return saved.success ? publishTrainingPlan(plan.id) : saved;
    });
  };
  return <main className="mx-auto max-w-6xl space-y-5 p-4 md:p-8 text-foreground">
    <Link href="/trainer/rutinas/planes" className="text-sm text-primary">← Volver a plantillas</Link>
    <div className="flex flex-wrap justify-between gap-3">
      <div><h1 className="text-2xl font-bold">{plan.title}</h1><p className="text-sm text-muted-foreground">{plan.durationWeeks} semanas · {plan.status === "draft" ? "Borrador" : "Publicado"}{plan.status === "published" && personalize ? " · Personalización para alumno (sin modificar plantilla)" : ""}</p></div>
      <div className="flex flex-wrap gap-2">
        <button className={button} disabled={pending} onClick={() => run(() => duplicateTrainingPlan(plan.id), (id) => id && router.push("/trainer/rutinas/planes/" + id))}>Duplicar plantilla</button>

      </div>
    </div>
    {plan.status === "draft" && <div className="sticky top-2 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-background/95 p-3 shadow-md backdrop-blur dark:border-slate-700" role="region" aria-label="Acciones de la plantilla">
      <span className="text-sm font-medium" role="status" aria-live="polite">{pending ? "Guardando..." : hasUnsavedChanges ? "● Cambios sin guardar" : "✓ Cambios guardados"}</span>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} disabled={pending || !hasUnsavedChanges} onClick={saveDraft}>{pending ? "Guardando..." : "Guardar cambios"}</button>
        <button type="button" className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-black disabled:opacity-50" disabled={pending} onClick={saveAndPublish}>Guardar y publicar</button>
      </div>
    </div>}
    {plan.status === "published" && <p className="rounded-lg border p-3 text-sm text-muted-foreground">Esta plantilla ya está publicada. Para modificar la plantilla y guardar una nueva versión, usá «Duplicar plantilla»; para ajustar únicamente la rutina de un alumno, activá «Personalizar ejercicios y cargas» antes de asignarla. Esos ajustes se guardan al asignar y no cambian la plantilla original.</p>}
    {message && <p role="status" className="rounded-lg border p-3 text-sm">{message}</p>}
    <section className="space-y-3 rounded-2xl border border-slate-300 bg-muted/10 p-4 dark:border-slate-700" aria-label="Seleccionar semana y día">
      <div className="space-y-1"><h2 className="text-base font-bold">1. Elegí la semana y el día</h2><p className="text-xs text-muted-foreground">Trabajá sobre un día a la vez. Cada semana conserva sus propias cargas.</p></div>
      <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm font-semibold">Semana:</span>
      {Array.from({ length: plan.durationWeeks }, (_, i) => <button key={i} type="button" className={button + (week === i ? " border-primary text-primary" : "")} onClick={() => setWeek(i)}>{i + 1}</button>)}
    </div>
    {editable && <details className="rounded-xl border border-slate-300 bg-muted/10 p-4 dark:border-slate-700" aria-label="Progresión semanal avanzada">
      <summary className="cursor-pointer list-item text-sm font-semibold">Progresión semanal <span className="ml-2 font-normal text-muted-foreground">· Opcional, configurar cuando la semana 1 esté lista</span></summary>
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
        <label className="text-sm">Repeticiones adicionales por semana
          <input type="number" className={field} step={1} min={-20} max={20} value={repIncrement} onChange={e => { setRepIncrement(bounded(Number(e.target.value) || 0, -20, 20)); setPreview(null); }} />
        </label>
        <label className="text-sm">Cambio de RIR por semana (negativo = mayor esfuerzo)
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
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-bold">2. Organizá los ejercicios</h2>{editable && <button type="button" className={button} disabled={draft.days.length >= 7} onClick={() => { setSelectedDay(draft.days.length); change({ days: [...draft.days, { title: "Día " + (draft.days.length + 1), modality: "strength", blocks: [] }] }); }}>+ Agregar día</button>}</div>
    {draft.days.length === 0 ? (
      <div role="status" className="rounded-xl border border-dashed border-slate-500/60 bg-slate-900/20 px-5 py-8 text-center dark:bg-slate-900/30">
        <p className="text-base font-semibold">Todavía no agregaste días de entrenamiento</p>
        <p className="mt-2 text-sm text-muted-foreground">Comenzá creando el primer día de tu planificación. Después vas a poder organizar bloques y ejercicios.</p>
        {editable && <button type="button" className={button + " mt-4 border-primary/60 text-primary dark:text-primary"} onClick={() => { setSelectedDay(0); change({ days: [{ title: "Día 1", modality: "strength", blocks: [] }] }); }}>+ Crear primer día</button>}
      </div>
    ) : <nav aria-label="Seleccionar día de entrenamiento" className="flex flex-wrap gap-2 rounded-xl border border-slate-300 p-3 dark:border-slate-700">
      {draft.days.map((day, di) => <button type="button" key={di} onClick={() => setSelectedDay(di)} aria-current={selectedDay === di ? "step" : undefined} className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${selectedDay === di ? "border-primary bg-primary/10 text-primary dark:text-primary" : "border-slate-300 hover:bg-muted dark:border-slate-600"}`}>Día {di + 1} · {day.title}</button>)}
    </nav>}
    </section>
    {draft.days.map((day, di) => selectedDay !== di ? null : <section key={di} className="rounded-2xl border border-slate-300 bg-muted/5 p-4 space-y-5 dark:border-slate-700">
      <div className="flex flex-wrap gap-2 items-center">
        <input aria-label="Nombre del día" className={field + " max-w-sm font-semibold"} disabled={!editable} value={day.title} onChange={(e) => updateDay(di, (d) => ({ ...d, title: e.target.value }))}/>
        <select aria-label="Modalidad" disabled={!editable} className={field + " max-w-40"} value={day.modality} onChange={(e) => updateDay(di, (d) => ({ ...d, modality: e.target.value as PlanDay["modality"] }))}>
          {["strength","running","mixed","mobility","other"].map((x) => <option key={x} value={x}>{({strength:"Fuerza",running:"Running",mixed:"Mixto",mobility:"Movilidad",other:"Otro"} as Record<string,string>)[x]}</option>)}
        </select>
        {editable && <button className={button} onClick={() => change({ days: draft.days.filter((_, i) => i !== di) })}>Eliminar día</button>}
      </div>
      {day.blocks.map((block, bi) => <div key={bi} className="rounded-xl border border-slate-300 bg-muted/20 p-3 sm:p-4 space-y-3 dark:border-slate-700">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
          <input aria-label="Nombre del bloque" className={field + " max-w-sm"} disabled={!editable} value={block.title} onChange={(e) => updateBlock(di, bi, (b) => ({ ...b, title: e.target.value }))}/>
          <select aria-label="Tipo de bloque" disabled={!editable} className={field + " max-w-44"} value={block.type} onChange={(e) => updateBlock(di, bi, (b) => ({ ...b, type: e.target.value as PlanBlock["type"] }))}>
            {["warmup","main","circuit","cooldown","custom"].map((x) => <option key={x} value={x}>{({warmup:"Entrada en calor",main:"Principal",circuit:"Circuito",cooldown:"Vuelta a la calma",custom:"Otro"} as Record<string,string>)[x]}</option>)}
          </select>
          {editable && <button className={button} onClick={() => updateDay(di, (d) => ({ ...d, blocks: d.blocks.filter((_, i) => i !== bi) }))}>Eliminar bloque</button>}
        </div>
        {block.items.map((item, ii) => { const rx = item.prescriptions[week] || {}; return <div key={item.key} className="rounded-xl border-2 border-slate-200 bg-background p-3 space-y-3 shadow-sm dark:border-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-xs font-semibold text-primary dark:text-primary">Ejercicio {ii + 1}</p><h3 className="text-base font-bold">{item.title || "Ejercicio sin nombre"}</h3></div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              {rx.sets !== undefined && <span className="rounded-lg bg-muted px-3 py-2">{rx.sets} series</span>}
              {rx.reps && <span className="rounded-lg bg-muted px-3 py-2">{rx.reps} rep.</span>}
              {rx.rir && <span className="rounded-lg bg-muted px-3 py-2">RIR {rx.rir}</span>}
              {rx.restSeconds !== undefined && <span className="rounded-lg bg-muted px-3 py-2">{rx.restSeconds}s descanso</span>}
            </div>
          </div>
          <details className="rounded-lg border border-slate-300 bg-muted/10 p-3 dark:border-slate-700">
            <summary className="cursor-pointer text-sm font-semibold text-cyan-700 dark:text-primary">Editar ejercicio, instrucciones e imagen</summary>
            <div className="mt-3">
          <div className="flex flex-wrap gap-2 items-start">
            {item.imageUrl && <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-300 bg-slate-100 p-2 dark:border-slate-600"><img src={item.imageUrl} alt={"Demostración de " + item.title} className="h-full w-full object-contain grayscale" /></div>}
            <div className="flex-1 space-y-2">
              <select aria-label="Seleccionar ejercicio del catálogo" className={field} disabled={!editable} value="" onChange={(e) => { const ex = exercises.find((x) => x.id === Number(e.target.value)); if (!ex) return; updateItem(di, bi, ii, (current) => ({ ...current, title: ex.name, imageUrl: ex.imageUrl, instructions: ex.instructions, prescriptions: current.prescriptions })); setPreview(null); setMessage("Ejercicio seleccionado. Se conservaron las cargas de todas las semanas; guardá el borrador para confirmar el cambio."); }}>
                <option value="">Elegir de Mis Ejercicios (biblioteca personal)</option>
                {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
              </select>
              <Link href="/trainer/ejercicios" className="inline-block text-xs font-semibold text-primary underline dark:text-primary">+ Crear o administrar mis ejercicios</Link>
              <input aria-label="Ejercicio" placeholder="Ej. Sentadilla o intervalos 400 m" className={field} disabled={!editable} value={item.title} onChange={(e) => updateItem(di, bi, ii, (x) => ({ ...x, title: e.target.value }))}/>
              <input aria-label="URL de imagen" placeholder="https://... imagen demostrativa" className={field} disabled={!editable} value={item.imageUrl || ""} onChange={(e) => updateItem(di, bi, ii, (x) => ({ ...x, imageUrl: e.target.value }))}/>
              <textarea aria-label="Instrucciones" placeholder="Indicaciones técnicas" className={field} disabled={!editable} value={item.instructions || ""} onChange={(e) => updateItem(di, bi, ii, (x) => ({ ...x, instructions: e.target.value }))}/>
            </div>
            {editable && <button className={button} onClick={() => updateBlock(di, bi, (b) => ({ ...b, items: b.items.filter((_, i) => i !== ii) }))}>Quitar</button>}
          </div>
            </div>
          </details>
          <details className="rounded-lg border border-slate-300 bg-muted/10 p-3 dark:border-slate-700">
            <summary className="cursor-pointer text-sm font-semibold">Ajustar cargas por semana <span className="font-normal text-muted-foreground">· {plan.durationWeeks} semanas · Opcional</span></summary>
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">Editá directamente cada celda para configurar las cargas por semana. Los cambios quedan en el borrador hasta guardar.</p>
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
          </details>
        </div>; })}
        {editable && <button type="button" className={button + " border-primary/50 text-primary dark:text-primary"} onClick={() => updateBlock(di, bi, (b) => ({ ...b, items: [...b.items, blank(plan.durationWeeks)] }))}>+ Agregar ejercicio / intervalo</button>}
      </div>)}
      {editable && <button type="button" className={button} onClick={() => updateDay(di, (d) => ({ ...d, blocks: [...d.blocks, { title: "Bloque principal", type: "main", items: [] }] }))}>+ Agregar bloque</button>}
    </section>)}
    {plan.status === "published" && <section className="rounded-xl border p-4 space-y-3">
      <h2 className="font-semibold">Asignar al alumno</h2>
      <p className="text-sm text-muted-foreground">La asignación conserva una copia independiente de la plantilla.</p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={personalize} onChange={(e) => { setPersonalize(e.target.checked); setDraft(structuredClone(plan.draft)); }}/> Personalizar ejercicios y cargas para este alumno antes de asignar</label>
      <select aria-label="Alumno" className={field} value={memberId} onChange={(e) => setMemberId(Number(e.target.value))}>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
      <button className={button} disabled={pending || !memberId} onClick={() => run(() => assignTrainingPlan(plan.id, memberId, personalize ? draft : undefined))}>Asignar planificación</button>
    </section>}
  </main>;
}
