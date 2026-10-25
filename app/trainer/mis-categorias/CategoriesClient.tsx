"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createTrainerCategory, setTrainerCategoryActive } from "../rutinas/planes/actions";

type Category = { dimension: string; slug: string; label: string; active: boolean };
const dimensions = [
  { key: "discipline", title: "Disciplinas", hint: "Ej.: Musculación, Running, Natación" },
  { key: "objective", title: "Objetivos", hint: "Ej.: Fuerza, Hipertrofia, Resistencia" },
  { key: "level", title: "Niveles", hint: "Ej.: Principiante, Intermedio, Avanzado" },
  { key: "audience", title: "Destinatarios", hint: "Ej.: Todos, Adultos mayores, Deportistas" },
];
export default function CategoriesClient({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [names, setNames] = useState<Record<string,string>>({});
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  function add(dimension: string) {
    setError(""); setNotice("");
    startTransition(async () => {
      const result = await createTrainerCategory(dimension, names[dimension] || "");
      if (!result.success) { setError(result.error || "No se pudo crear"); return; }
      setNames(v => ({ ...v, [dimension]: "" }));
      setNotice("Categoría creada correctamente");
      router.refresh();
    });
  }
  function toggle(category: Category) {
    setError(""); setNotice("");
    startTransition(async () => {
      const result = await setTrainerCategoryActive(category.slug, !category.active);
      if (!result.success) { setError(result.error || "No se pudo actualizar"); return; }
      router.refresh();
    });
  }
  return <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-transparent p-6">
      <div><p className="text-xs font-bold uppercase tracking-widest text-cyan-500">Trainer Hub · Personalización</p><h1 className="mt-2 text-3xl font-extrabold">Mis categorías</h1><p className="mt-2 max-w-xl text-sm text-muted-foreground">Creá tus propias opciones para organizar las planificaciones. Solo vos vas a verlas al crear una plantilla.</p></div>
      <Link href="/trainer/rutinas/planes" className="rounded-xl border border-cyan-500/30 px-4 py-3 text-sm font-semibold text-cyan-500 hover:bg-cyan-500/10">Ir a planificaciones →</Link>
    </header>
    {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">{notice}</p>}
    <div className="grid gap-5 lg:grid-cols-2">
      {dimensions.map(d => <section key={d.key} className="space-y-4 rounded-2xl border border-slate-700 p-5">
        <div><h2 className="text-lg font-bold">{d.title}</h2><p className="text-xs text-muted-foreground">{d.hint}</p></div>
        <form className="flex flex-wrap gap-2" onSubmit={e => {e.preventDefault();add(d.key);}}>
          <input aria-label={"Nueva categoría para " + d.title} maxLength={80} required minLength={2} placeholder={"Nueva " + d.title.toLowerCase().slice(0,-1)} value={names[d.key] || ""} onChange={e=>setNames(v=>({...v,[d.key]:e.target.value}))} className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-background px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none"/>
          <button disabled={pending} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">+ Agregar</button>
        </form>
        <div className="space-y-2">
          {categories.filter(c=>c.dimension===d.key).length===0 && <p className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-muted-foreground">Todavía no creaste opciones.</p>}
          {categories.filter(c=>c.dimension===d.key).map(c=><div key={c.slug} className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/70 bg-muted/10 px-3 py-2">
            <span className={c.active ? "text-sm font-semibold" : "text-sm text-muted-foreground"}>{c.label}{!c.active && <span className="ml-2 text-xs">(Archivada)</span>}</span>
            <button type="button" disabled={pending} onClick={()=>toggle(c)} className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-cyan-500 disabled:opacity-50">{c.active ? "Archivar" : "Reactivar"}</button>
          </div>)}
        </div>
      </section>)}
    </div>
    <p className="text-xs text-muted-foreground">Archivar oculta una opción de las nuevas plantillas, sin borrar sus referencias en planificaciones existentes.</p>
  </main>;
}
