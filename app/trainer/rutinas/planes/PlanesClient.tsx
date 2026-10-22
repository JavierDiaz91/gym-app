"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createTrainingPlan, type PlanInput } from "./actions";

type Plan = { id: number; title: string; description: string; durationWeeks: number; status: string; version: number };
const choices = {
  discipline: [["musculacion","Musculación"],["running","Running"],["funcional","Funcional"],["movilidad","Movilidad"],["preparacion_fisica","Preparación física"]],
  objective: [["fuerza","Fuerza"],["hipertrofia","Hipertrofia"],["resistencia","Resistencia"],["potencia","Potencia"],["movilidad","Movilidad"]],
  level: [["principiante","Principiante"],["intermedio","Intermedio"],["avanzado","Avanzado"]],
  audience: [["todos","Todos"],["mujeres","Mujeres"],["hombres","Hombres"]],
};
const initial: PlanInput = { title:"", description:"", durationWeeks:4, discipline:"musculacion", objective:"fuerza", level:"principiante", audience:"todos" };
export default function PlanesClient({ plans, setupError }: { plans: Plan[]; setupError?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<PlanInput>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const change = (key: keyof PlanInput, value: string | number) => setForm((prev) => ({...prev, [key]:value}));
  function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    startTransition(async () => {
      const result = await createTrainingPlan(form);
      if (!result.success) { setError(result.error || "No se pudo guardar"); return; }
      setShowForm(false); setForm(initial); router.refresh();
    });
  }
  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8 space-y-6 text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Planificaciones deportivas</h1><p className="text-muted-foreground text-sm">Plantillas de entrenamiento por disciplina, objetivo y nivel.</p></div>
        <button type="button" disabled={!!setupError} onClick={() => setShowForm((v) => !v)} className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-black disabled:opacity-50">{showForm ? "Cerrar" : "Nueva plantilla"}</button>
      </div>
      {setupError && <p role="alert" className="rounded-lg border border-amber-500 p-4 text-sm">{setupError}</p>}
      {showForm && !setupError && <form onSubmit={submit} className="rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold">Crear plantilla</h2>
        <label className="block text-sm">Título<input required maxLength={150} value={form.title} onChange={(e)=>change("title",e.target.value)} className="mt-1 w-full rounded-lg border bg-background p-2" placeholder="Fuerza para corredores" /></label>
        <label className="block text-sm">Descripción<textarea maxLength={2000} value={form.description} onChange={(e)=>change("description",e.target.value)} className="mt-1 w-full rounded-lg border bg-background p-2" rows={3}/></label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(["discipline","objective","level","audience"] as const).map((key) => <label key={key} className="text-sm">{({discipline:"Disciplina",objective:"Objetivo",level:"Nivel",audience:"Dirigido a"})[key]}
            <select value={form[key]} onChange={(e)=>change(key,e.target.value)} className="mt-1 w-full rounded-lg border bg-background p-2">{choices[key].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
          </label>)}
          <label className="text-sm">Semanas<input type="number" min={1} max={52} required value={form.durationWeeks} onChange={(e)=>change("durationWeeks",Number(e.target.value))} className="mt-1 w-full rounded-lg border bg-background p-2"/></label>
        </div>
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        <button disabled={pending} className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-black disabled:opacity-50">{pending ? "Guardando..." : "Guardar borrador"}</button>
      </form>}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.length === 0 && <p className="text-muted-foreground">Todavía no hay plantillas creadas.</p>}
        {plans.map((p) => <article key={p.id} className="rounded-xl border p-5 space-y-2">
          <h2 className="font-semibold">{p.title}</h2><Link className="inline-block rounded-lg border px-3 py-2 text-sm text-cyan-500" href={"/trainer/rutinas/planes/" + p.id}>Abrir constructor</Link><p className="text-sm text-muted-foreground">{p.description}</p>
          <p className="text-xs text-muted-foreground">{p.durationWeeks} semanas · Versión {p.version} · {p.status === "draft" ? "Borrador" : p.status}</p>
        </article>)}
      </section>
    </main>
  );
}
