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

export default function PlanEditor({ plan, members, exercises }: { plan: Plan; members: { id: number; name: string }[]; exercises: { id: number; name: string; imageUrl: string }[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<PlanDraft>(plan.draft || { days: [] });
  const [week, setWeek] = useState(0);
  const [memberId, setMemberId] = useState(members[0]?.id || 0);
  const [personalize, setPersonalize] = useState(false);
  const [message, setMessage] = useState("");
  const [scope, setScope] = useState<ProgressScope>("main");
  const [repIncrement, setRepIncrement] = useState(2);
  const [rirIncrement, setRirIncrement] = useState(-1);
  const [deload, setDeload] = useState(true);
  const [preview, setPreview] = useState<PlanDraft | null>(null);
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
  return <main className="mx-auto max-w-6xl space-y-5 p-4 md:p-8 text-foreground">
    <Link href="/trainer/rutinas/planes" className="text-sm text-cyan-500">← Volver a plantillas</Link>
    <div className="flex flex-wrap justify-between gap-3">
      <div><h1 className="text-2xl font-bold">{plan.title}</h1><p className="text-sm text-muted-foreground">{plan.durationWeeks} semanas · {editable ? "Borrador" : "Publicado"}</p></div>
      <div className="flex flex-wrap gap-2">
        <button className={button} disabled={pending} onClick={() => run(() => duplicateTrainingPlan(plan.id), (id) => id && router.push("/trainer/rutinas/planes/" + id))}>Duplicar plantilla</button>
        {plan.status === "draft" && <><button className={button} disabled={pending} onClick={() => run(() => saveTrainingPlanDraft(plan.id, draft))}>Guardar borrador</button>
        <button className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-black disabled:opacity-50" disabled={pending} onClick={() => run(async () => {
          const saved = await saveTrainingPlanDraft(plan.id, draft);
          return saved.success ? publishTrainingPlan(plan.id) : saved;
        })}>Guardar y publicar</button></>}
      </div>
    </div>
    {message && <p role="status" className="rounded-lg border p-3 text-sm">{message}</p>}
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm font-semibold">Semana:</span>
      {Array.from({ length: plan.durationWeeks }, (_, i) => <button key={i} type="button" className={button + (week === i ? " border-cyan-500 text-cyan-500" : "")} onClick={() => setWeek(i)}>{i + 1}</button>)}
    </div>
    {editable && <section className="rounded-xl border p-4 space-y-3">
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
        {preview && <button type="button" className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-black" onClick={applyProgression}>Aplicar progresión</button>}
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
    </section>}
    {editable && <button className={button} disabled={draft.days.length >= 7} onClick={() => change({ days: [...draft.days, { title: "Día " + (draft.days.length + 1), modality: "strength", blocks: [] }] })}>+ Agregar día</button>}
    {draft.days.map((day, di) => <section key={di} className="rounded-xl border p-4 space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input aria-label="Nombre del día" className={field + " max-w-sm font-semibold"} disabled={!editable} value={day.title} onChange={(e) => updateDay(di, (d) => ({ ...d, title: e.target.value }))}/>
        <select aria-label="Modalidad" disabled={!editable} className={field + " max-w-40"} value={day.modality} onChange={(e) => updateDay(di, (d) => ({ ...d, modality: e.target.value as PlanDay["modality"] }))}>
          {["strength","running","mixed","mobility","other"].map((x) => <option key={x} value={x}>{({strength:"Fuerza",running:"Running",mixed:"Mixto",mobility:"Movilidad",other:"Otro"} as Record<string,string>)[x]}</option>)}
        </select>
        {editable && <button className={button} onClick={() => change({ days: draft.days.filter((_, i) => i !== di) })}>Eliminar día</button>}
      </div>
      {day.blocks.map((block, bi) => <div key={bi} className="rounded-lg bg-muted/40 p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <input aria-label="Nombre del bloque" className={field + " max-w-sm"} disabled={!editable} value={block.title} onChange={(e) => updateBlock(di, bi, (b) => ({ ...b, title: e.target.value }))}/>
          <select aria-label="Tipo de bloque" disabled={!editable} className={field + " max-w-44"} value={block.type} onChange={(e) => updateBlock(di, bi, (b) => ({ ...b, type: e.target.value as PlanBlock["type"] }))}>
            {["warmup","main","circuit","cooldown","custom"].map((x) => <option key={x} value={x}>{({warmup:"Entrada en calor",main:"Principal",circuit:"Circuito",cooldown:"Vuelta a la calma",custom:"Otro"} as Record<string,string>)[x]}</option>)}
          </select>
          {editable && <button className={button} onClick={() => updateDay(di, (d) => ({ ...d, blocks: d.blocks.filter((_, i) => i !== bi) }))}>Eliminar bloque</button>}
        </div>
        {block.items.map((item, ii) => { const rx = item.prescriptions[week] || {}; return <div key={item.key} className="rounded-lg border bg-background p-3 space-y-3">
          <div className="flex flex-wrap gap-2 items-start">
            {item.imageUrl && <img src={item.imageUrl} alt={"Demostración de " + item.title} className="h-24 w-24 rounded-lg object-cover" />}
            <div className="flex-1 space-y-2">
              <select aria-label="Seleccionar ejercicio del catálogo" className={field} disabled={!editable} value="" onChange={(e) => { const ex = exercises.find((x) => x.id === Number(e.target.value)); if (ex) updateItem(di, bi, ii, (x) => ({ ...x, title: ex.name, imageUrl: ex.imageUrl || x.imageUrl })); }}>
                <option value="">Elegir ejercicio del catálogo (opcional)</option>
                {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
              </select>
              <input aria-label="Ejercicio" placeholder="Ej. Sentadilla o intervalos 400 m" className={field} disabled={!editable} value={item.title} onChange={(e) => updateItem(di, bi, ii, (x) => ({ ...x, title: e.target.value }))}/>
              <input aria-label="URL de imagen" placeholder="https://... imagen demostrativa" className={field} disabled={!editable} value={item.imageUrl || ""} onChange={(e) => updateItem(di, bi, ii, (x) => ({ ...x, imageUrl: e.target.value }))}/>
              <textarea aria-label="Instrucciones" placeholder="Indicaciones técnicas" className={field} disabled={!editable} value={item.instructions || ""} onChange={(e) => updateItem(di, bi, ii, (x) => ({ ...x, instructions: e.target.value }))}/>
            </div>
            {editable && <button className={button} onClick={() => updateBlock(di, bi, (b) => ({ ...b, items: b.items.filter((_, i) => i !== ii) }))}>Quitar</button>}
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {([["sets","Series"],["reps","Repeticiones"],["rir","RIR"],["restSeconds","Descanso (seg)"],["tempo","Tempo"],["distanceMeters","Distancia (m)"],["durationSeconds","Duración (seg)"],["pace","Ritmo"]] as const).map(([key,label]) =>
              <label key={key} className="text-xs">{label}<input className={field} disabled={!editable} type={["sets","restSeconds","distanceMeters","durationSeconds"].includes(key) ? "number" : "text"} min={0} value={rx[key] ?? ""} onChange={(e) => updateRx(di, bi, ii, { [key]: ["sets","restSeconds","distanceMeters","durationSeconds"].includes(key) ? (e.target.value === "" ? undefined : Number(e.target.value)) : e.target.value })}/></label>)}
          </div>
          <textarea aria-label="Notas de la semana" className={field} disabled={!editable} placeholder="Notas de esta semana" value={rx.notes || ""} onChange={(e) => updateRx(di, bi, ii, { notes: e.target.value })}/>
        </div>; })}
        {editable && <button className={button} onClick={() => updateBlock(di, bi, (b) => ({ ...b, items: [...b.items, blank(plan.durationWeeks)] }))}>+ Agregar ejercicio / intervalo</button>}
      </div>)}
      {editable && <button className={button} onClick={() => updateDay(di, (d) => ({ ...d, blocks: [...d.blocks, { title: "Bloque principal", type: "main", items: [] }] }))}>+ Agregar bloque</button>}
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
