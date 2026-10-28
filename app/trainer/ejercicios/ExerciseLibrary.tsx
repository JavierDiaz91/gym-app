"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { archiveTrainerExercise, listTrainerExercises, saveTrainerExercise, uploadTrainerExerciseImage, type ExerciseInput, type TrainerExercise } from "./actions";

const empty: ExerciseInput = { name: "", instructions: "", imageUrl: "", muscleGroup: "", equipment: "" };
// Presentation-only: the original image URL and Blob contents are never altered.
const imageFrame = "flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-300 bg-slate-100 p-2 dark:border-slate-600 dark:bg-slate-100";
const monochromeImage = "h-full w-full object-contain grayscale";
const inputClass = "w-full rounded-lg border border-slate-300 bg-background px-3 py-2 text-sm dark:border-slate-700";
export default function ExerciseLibrary({ initial }: {initial: TrainerExercise[]}) {
  const [items, setItems] = useState(initial);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ExerciseInput>(empty);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const uploadImage = async (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 5 * 1024 * 1024) { setMessage("Seleccioná una imagen JPG, PNG, WebP o GIF de hasta 5 MB."); return; }
    setUploading(true); setMessage("");
    try {
      const data = new FormData(); data.append("image", file);
      const result = await uploadTrainerExerciseImage(data);
      if (result.success && result.url) { setForm(current => ({ ...current, imageUrl: result.url! })); setMessage("Imagen subida. Guardá el ejercicio para asociarla."); }
      else setMessage(result.error || "No se pudo subir la imagen.");
    } catch { setMessage("No se pudo subir la imagen."); }
    finally { setUploading(false); }
  };
  const edit = (x: TrainerExercise) => { setEditingId(x.id); setForm({name:x.name,instructions:x.instructions,imageUrl:x.imageUrl,muscleGroup:x.muscleGroup,equipment:x.equipment}); window.scrollTo({top:0,behavior:"smooth"}); };
  const reset = () => { setEditingId(null); setForm(empty); };
  const refresh = async () => { setItems(await listTrainerExercises()); };
  const save = (e: React.FormEvent) => {
    e.preventDefault(); setMessage("");
    startTransition(async () => {
      const result = await saveTrainerExercise(form, editingId ?? undefined);
      setMessage(result.success ? "Ejercicio guardado correctamente." : result.error || "Error");
      if (result.success) { reset(); await refresh(); }
    });
  };
  const archive = (x: TrainerExercise) => {
    if (!window.confirm("¿Archivar " + x.name + "? Las rutinas existentes conservarán su información.")) return;
    startTransition(async () => {
      const result = await archiveTrainerExercise(x.id);
      setMessage(result.success ? "Ejercicio archivado." : result.error || "Error");
      if (result.success) { if (editingId === x.id) reset(); await refresh(); }
    });
  };
  return <div className="mx-auto max-w-5xl space-y-6 text-foreground">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-primary dark:text-primary">Trainer Hub</p><h1 className="text-2xl font-bold">Mis Ejercicios</h1><p className="text-sm text-muted-foreground">Creá una vez cada ejercicio y reutilizalo en todas tus planificaciones.</p></div>
      <Link href="/trainer/rutinas/planes" className="rounded-lg border px-4 py-2 text-sm font-semibold">Ir al planificador →</Link>
    </div>
    {message && <p role="status" className="rounded-lg border p-3 text-sm">{message}</p>}
    <form onSubmit={save} className="rounded-2xl border-2 border-slate-300 bg-background p-5 shadow-sm dark:border-slate-700 space-y-4">
      <h2 className="text-lg font-bold">{editingId ? "Editar ejercicio" : "Nuevo ejercicio"}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">Nombre del ejercicio *<input required maxLength={150} className={inputClass} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ej. Sentadilla goblet" /></label>
        <label className="space-y-1 text-sm font-medium">Grupo muscular<input maxLength={100} className={inputClass} value={form.muscleGroup} onChange={e=>setForm({...form,muscleGroup:e.target.value})} placeholder="Ej. Piernas" /></label>
        <label className="space-y-1 text-sm font-medium">Equipamiento<input maxLength={100} className={inputClass} value={form.equipment} onChange={e=>setForm({...form,equipment:e.target.value})} placeholder="Ej. Mancuerna" /></label>
        <label className="space-y-1 text-sm font-medium">Imagen demostrativa (desde tu computadora)<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading || pending} className={inputClass} onChange={e => { void uploadImage(e.target.files?.[0]); e.target.value = ""; }} /><span className="block text-xs text-muted-foreground">{uploading ? "Subiendo imagen..." : "JPG, PNG, WebP o GIF · máximo 5 MB"}</span></label>
      </div>
      <label className="block space-y-1 text-sm font-medium">Cómo realizarlo<textarea rows={3} maxLength={2000} className={inputClass} value={form.instructions} onChange={e=>setForm({...form,instructions:e.target.value})} placeholder="Instrucciones y técnica para el alumno" /></label>
      {form.imageUrl && <div className="flex items-center gap-3"><div className={imageFrame}><img src={form.imageUrl} alt="Vista previa" className={monochromeImage} /></div><span className="text-xs text-muted-foreground">Vista previa en blanco y negro · el archivo original conserva sus colores.</span></div>}
      <p className="text-xs text-muted-foreground">La imagen original se almacena en Vercel Blob sin modificar. La biblioteca la muestra en blanco y negro sobre un fondo uniforme.</p>
      <div className="flex gap-2"><button disabled={pending || uploading} type="submit" className="rounded-lg bg-primary px-5 py-2 font-semibold text-black disabled:opacity-50">{pending?"Guardando...":editingId?"Guardar cambios":"Crear ejercicio"}</button>{editingId && <button type="button" onClick={reset} className="rounded-lg border px-4 py-2">Cancelar</button>}</div>
    </form>
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">Mi biblioteca ({items.length})</h2><input aria-label="Buscar ejercicio" className={inputClass+" max-w-xs"} placeholder="Buscar por nombre..." value={query} onChange={e=>setQuery(e.target.value)} /></div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.filter(x=>x.name.toLowerCase().includes(query.toLowerCase())).map(x=><article key={x.id} className="flex gap-4 rounded-xl border-2 border-slate-300 bg-background p-4 shadow-sm dark:border-slate-700">
          <div className={imageFrame}>{x.imageUrl ? <img src={x.imageUrl} alt={x.name} className={monochromeImage} /> : <span className="text-center text-xs text-slate-500">Sin imagen</span>}</div>
          <div className="min-w-0 flex-1 space-y-1"><h3 className="font-bold">{x.name}</h3><p className="text-xs text-muted-foreground">{[x.muscleGroup,x.equipment].filter(Boolean).join(" · ") || "Sin categoría"}</p><p className="line-clamp-2 text-xs text-muted-foreground">{x.instructions || "Sin instrucciones"}</p><div className="flex gap-2 pt-2"><button onClick={()=>edit(x)} className="rounded-lg border px-3 py-1 text-xs font-semibold">Editar</button><button disabled={pending} onClick={()=>archive(x)} className="rounded-lg border px-3 py-1 text-xs text-red-600">Archivar</button></div></div>
        </article>)}
      </div>
      {!items.length && <p className="rounded-xl border p-5 text-sm text-muted-foreground">Todavía no creaste ejercicios. Empezá con el formulario de arriba.</p>}
    </section>
  </div>;
}
