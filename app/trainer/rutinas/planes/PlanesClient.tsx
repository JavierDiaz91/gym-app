"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createTrainingPlan, type PlanInput } from "./actions";

type Plan = { id: number; title: string; description: string; durationWeeks: number; status: string; version: number };
const fieldStyle = "mt-2 w-full rounded-xl border border-slate-300 bg-background px-3 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700";
const initial: PlanInput = { title:"", description:"", durationWeeks:4, discipline:"", objective:"", level:"", audience:"" };
export default function PlanesClient({ plans, categories, setupError }: { plans: Plan[]; categories: {dimension:string;slug:string;label:string}[]; setupError?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<PlanInput>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const change = (key: keyof PlanInput, value: string | number) => setForm((prev) => ({...prev, [key]:value}));
  const byDimension = (dimension:string) => categories.filter(c=>c.dimension===dimension);
  function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    startTransition(async () => {
      const completed = { ...form };
      for (const key of ["discipline","objective","level","audience"] as const) {
        if (!byDimension(key).some(c => c.slug === completed[key])) completed[key] = byDimension(key)[0]?.slug || "";
      }
      const result = await createTrainingPlan(completed);
      if (!result.success) { setError(result.error || "No se pudo guardar"); return; }
      if (result.id) { router.push(`/trainer/rutinas/planes/${result.id}`); return; }
      setError("La rutina se creó, pero no se pudo abrir automáticamente. Actualizá el listado."); router.refresh();
    });
  }
  return (
    <main className="mx-auto max-w-6xl space-y-7 p-4 text-foreground md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-sky-500/5 to-transparent p-6 md:p-7"><div className="space-y-2"><p className="text-xs font-bold uppercase tracking-widest text-primary">PANEL ENTRENADOR · PLANIFICADOR</p><h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Mis rutinas</h1><p className="max-w-xl text-sm leading-relaxed text-muted-foreground">Creá una rutina, organizá los ejercicios y asignala a tus alumnos.</p><p className="text-xs font-semibold text-primary">{plans.length} {plans.length === 1 ? "rutina disponible" : "rutinas disponibles"}</p></div><button type="button" disabled={!!setupError} onClick={() => setShowForm((v) => !v)} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-primary disabled:opacity-50">{showForm ? "Cancelar" : "+ Crear rutina"}</button></header>
      <nav aria-label="Pasos para crear una rutina" className="grid gap-2 sm:grid-cols-3">{["1. Crear rutina", "2. Organizar ejercicios", "3. Asignar a alumnos"].map((step, index) => <div key={step} className={`rounded-xl border px-4 py-3 text-sm font-semibold ${index === 0 ? "border-primary/50 bg-primary/10 text-primary" : "border-slate-700/40 text-muted-foreground"}`}>{step}</div>)}</nav>
      {setupError && <p role="alert" className="rounded-lg border border-amber-500 p-4 text-sm">{setupError}</p>}
      {!setupError && categories.length===0 && <p className="rounded-lg border p-4">Para crear una rutina, primero necesitás categorías básicas. <Link className="font-bold text-primary underline" href="/trainer/mis-categorias">Configurar categorías</Link> antes de crear una plantilla.</p>}
      {showForm && !setupError && <form onSubmit={submit} className="space-y-6 rounded-2xl border border-slate-300 bg-muted/10 p-5 shadow-sm dark:border-slate-700 md:p-7">
        <div className="border-b border-slate-300/60 pb-4 dark:border-slate-700"><p className="mb-1 text-xs font-bold uppercase tracking-widest text-primary">Paso 1 de 3</p><h2 className="text-xl font-bold">Datos de la rutina</h2><p className="mt-1 text-sm text-muted-foreground">Ingresá un nombre y la cantidad de semanas. Después agregás los ejercicios.</p></div>
        <label className="block text-sm font-semibold">Título<input required maxLength={150} value={form.title} onChange={(e)=>change("title",e.target.value)} className={fieldStyle} placeholder="Fuerza para corredores" /></label>
        <label className="block text-sm font-semibold">Descripción (opcional)<textarea maxLength={2000} value={form.description} onChange={(e)=>change("description",e.target.value)} className={fieldStyle} rows={3}/></label>
        <label className="block text-sm font-semibold">Duración (semanas)<input type="number" min={1} max={52} required value={form.durationWeeks} onChange={(e)=>change("durationWeeks",Number(e.target.value))} className={fieldStyle}/></label>
        <details open={advanced} onToggle={(e)=>setAdvanced(e.currentTarget.open)} className="rounded-xl border border-slate-700/40 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-primary">Clasificación avanzada (opcional)</summary>
          <p className="mt-2 text-xs text-muted-foreground">Si no elegís categorías, se utilizará la primera disponible en cada grupo.</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(["discipline","objective","level","audience"] as const).map((key) => <label key={key} className="text-sm font-semibold">{({discipline:"Disciplina",objective:"Objetivo",level:"Nivel",audience:"Dirigido a"})[key]}
              <select value={form[key]} onChange={(e)=>change(key,e.target.value)} className={fieldStyle}><option value="">Automático</option>{byDimension(key).map(c=><option key={c.slug} value={c.slug}>{c.label}</option>)}</select>
            </label>)}
          </div>
          <Link href="/trainer/mis-categorias" className="mt-3 inline-block text-xs font-semibold text-primary underline">Administrar categorías</Link>
        </details>
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        <button disabled={pending || (["discipline","objective","level","audience"] as const).some(key=>byDimension(key).length===0)} className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-primary disabled:opacity-50">{pending ? "Guardando..." : "Guardar borrador"}</button>
      </form>}
      <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-widest text-primary">Tus entrenamientos</p><h2 className="mt-1 text-xl font-bold">Rutinas creadas</h2></div><span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{plans.length} en total</span></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.length === 0 && <p className="col-span-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Todavía no creaste rutinas. Presioná «Crear rutina» para empezar.</p>}
        {plans.map((p) => <article key={p.id} className="flex flex-col gap-4 rounded-2xl border border-slate-300 bg-muted/10 p-5 shadow-sm transition-colors hover:border-primary/50 dark:border-slate-700"><div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{p.durationWeeks} {p.durationWeeks === 1 ? "semana" : "semanas"}</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${p.status === "draft" ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"}`}>{p.status === "draft" ? "Borrador" : p.status === "published" ? "Publicado" : p.status}</span></div><div className="flex-1 space-y-2"><h3 className="text-lg font-bold leading-snug">{p.title}</h3><p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{p.description || "Agregá días y ejercicios para completar esta rutina."}</p></div><div className="flex items-center justify-between gap-3 border-t border-slate-300/60 pt-4 dark:border-slate-700"><span className="text-xs text-muted-foreground">Rutina #{p.id}</span><Link className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/20" href={"/trainer/rutinas/planes/" + p.id}>Continuar →</Link></div></article>)}
      </div></section>
    </main>
  );
}
