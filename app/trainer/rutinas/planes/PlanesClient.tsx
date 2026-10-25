"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createTrainingPlan, type PlanInput } from "./actions";

type Plan = { id: number; title: string; description: string; durationWeeks: number; status: string; version: number };
const fieldStyle = "mt-2 w-full rounded-xl border border-slate-300 bg-background px-3 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700";
const initial: PlanInput = { title:"", description:"", durationWeeks:4, discipline:"musculacion", objective:"fuerza", level:"principiante", audience:"todos" };
export default function PlanesClient({ plans, categories, setupError }: { plans: Plan[]; categories: {dimension:string;slug:string;label:string}[]; setupError?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<PlanInput>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const change = (key: keyof PlanInput, value: string | number) => setForm((prev) => ({...prev, [key]:value}));
  const byDimension = (dimension:string) => categories.filter(c=>c.dimension===dimension);
  function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    startTransition(async () => {
      const result = await createTrainingPlan(form);
      if (!result.success) { setError(result.error || "No se pudo guardar"); return; }
      setShowForm(false); setForm(initial); router.refresh();
    });
  }
  return (
    <main className="mx-auto max-w-6xl space-y-7 p-4 text-foreground md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 via-sky-500/5 to-transparent p-6 md:p-7"><div className="space-y-2"><p className="text-xs font-bold uppercase tracking-widest text-cyan-500">Trainer Hub · Planificador</p><h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Planificaciones deportivas</h1><p className="max-w-xl text-sm leading-relaxed text-muted-foreground">Diseñá entrenamientos, organizá las semanas y reutilizá tus plantillas con tus alumnos.</p><p className="text-xs font-semibold text-cyan-500">{plans.length} {plans.length === 1 ? "plantilla disponible" : "plantillas disponibles"}</p></div><button type="button" disabled={!!setupError} onClick={() => setShowForm((v) => !v)} className="rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50">{showForm ? "Cerrar formulario" : "+ Nueva plantilla"}</button></header>
      {setupError && <p role="alert" className="rounded-lg border border-amber-500 p-4 text-sm">{setupError}</p>}
      {!setupError && categories.length===0 && <p className="rounded-lg border p-4">El gimnasio todavía no habilitó categorías deportivas. Pedile al administrador que las configure.</p>}
      {showForm && !setupError && <form onSubmit={submit} className="space-y-6 rounded-2xl border border-slate-300 bg-muted/10 p-5 shadow-sm dark:border-slate-700 md:p-7">
        <div className="border-b border-slate-300/60 pb-4 dark:border-slate-700"><p className="mb-1 text-xs font-bold uppercase tracking-widest text-cyan-500">Nueva planificación</p><h2 className="text-xl font-bold">Creá tu plantilla</h2><p className="mt-1 text-sm text-muted-foreground">Completá los datos generales. Después vas a poder organizar los días y ejercicios.</p></div>
        <label className="block text-sm font-semibold">Título<input required maxLength={150} value={form.title} onChange={(e)=>change("title",e.target.value)} className={fieldStyle} placeholder="Fuerza para corredores" /></label>
        <label className="block text-sm font-semibold">Descripción<textarea maxLength={2000} value={form.description} onChange={(e)=>change("description",e.target.value)} className={fieldStyle} rows={3}/></label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(["discipline","objective","level","audience"] as const).map((key) => <label key={key} className="text-sm font-semibold">{({discipline:"Disciplina",objective:"Objetivo",level:"Nivel",audience:"Dirigido a"})[key]}
            <select value={byDimension(key).some(c=>c.slug===form[key]) ? form[key] : ""} required onChange={(e)=>change(key,e.target.value)} className={fieldStyle}><option value="">Seleccionar...</option>{byDimension(key).map(c=><option key={c.slug} value={c.slug}>{c.label}</option>)}</select>
          </label>)}
          <label className="text-sm font-semibold">Semanas<input type="number" min={1} max={52} required value={form.durationWeeks} onChange={(e)=>change("durationWeeks",Number(e.target.value))} className={fieldStyle}/></label>
        </div>
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        <button disabled={pending || (["discipline","objective","level","audience"] as const).some(key=>!byDimension(key).some(c=>c.slug===form[key]))} className="rounded-xl bg-cyan-500 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50">{pending ? "Guardando..." : "Guardar borrador"}</button>
      </form>}
      <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-widest text-cyan-500">Biblioteca de planes</p><h2 className="mt-1 text-xl font-bold">Tus plantillas</h2></div><span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-500">{plans.length} en total</span></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.length === 0 && <p className="col-span-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Todavía no hay plantillas creadas. Empezá con «Nueva plantilla» para diseñar tu primer entrenamiento.</p>}
        {plans.map((p) => <article key={p.id} className="flex flex-col gap-4 rounded-2xl border border-slate-300 bg-muted/10 p-5 shadow-sm transition-colors hover:border-cyan-500/50 dark:border-slate-700"><div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-500">{p.durationWeeks} {p.durationWeeks === 1 ? "semana" : "semanas"}</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${p.status === "draft" ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"}`}>{p.status === "draft" ? "Borrador" : p.status === "published" ? "Publicado" : p.status}</span></div><div className="flex-1 space-y-2"><h3 className="text-lg font-bold leading-snug">{p.title}</h3><p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{p.description || "Planificación lista para configurar sus días, bloques y ejercicios."}</p></div><div className="flex items-center justify-between gap-3 border-t border-slate-300/60 pt-4 dark:border-slate-700"><span className="text-xs text-muted-foreground">Versión {p.version}</span><Link className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-500 transition hover:bg-cyan-500/20" href={"/trainer/rutinas/planes/" + p.id}>Abrir constructor →</Link></div></article>)}
      </div></section>
    </main>
  );
}
