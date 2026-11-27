"use client";
import { useState, useRef, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
type Result = { ok: boolean; message: string };
export function ModuleForm({ children, save }: { children: ReactNode; save: (data: FormData) => Promise<Result> }) {
  const form = useRef<HTMLFormElement>(null);
  const baseline = useRef<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const snapshot = () => JSON.stringify(Array.from(new FormData(form.current!).entries()));
  return <form ref={node => { form.current = node; if (node && baseline.current === null) baseline.current = JSON.stringify(Array.from(new FormData(node).entries())); }}
    className="space-y-4" onChange={() => { setDirty(snapshot() !== baseline.current); setResult(null); }}
    onReset={event => { event.preventDefault(); if (!form.current || pending) return; const entries = JSON.parse(baseline.current ?? "[]") as [string,string][]; const checked = new Set(entries.map(([key]) => key)); form.current.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(input => { input.checked = checked.has(input.name); }); setDirty(false); setResult(null); }}
    onSubmit={async event => { event.preventDefault(); if (pending || !dirty || !form.current) return; const data = new FormData(form.current); const submitted = JSON.stringify(Array.from(data.entries())); setPending(true); setResult(null); try { const response = await save(data); setResult(response); if (response.ok) { baseline.current = submitted; setDirty(false); } } catch { setResult({ok:false,message:"No se pudo confirmar el guardado. Volvé a intentar."}); } finally { setPending(false); } }}>
    <fieldset disabled={pending} className="min-w-0 space-y-4">{children}</fieldset>
    <div className="space-y-3 rounded-xl border border-border bg-card p-3 sm:sticky sm:bottom-4 sm:z-20 sm:pr-16 sm:shadow-lg">
      {result && <div role={result.ok ? "status" : "alert"} className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${result.ok ? "border-primary/40 text-primary" : "border-destructive text-destructive"}`}>{result.ok ? <CheckCircle2 className="size-5 shrink-0"/> : <AlertCircle className="size-5 shrink-0"/>}{result.message}</div>}
      <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap sm:justify-end"><span className="col-span-2 sm:mr-auto text-xs text-muted-foreground">{dirty ? "Tenés cambios sin guardar." : "Los cambios se aplican al gimnasio seleccionado."}</span>
      <button type="reset" disabled={!dirty || pending} className="rounded-lg border border-border min-h-11 px-2 py-2 text-sm disabled:opacity-50">Restablecer</button>
      <button type="submit" disabled={!dirty || pending} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary min-h-11 px-2 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{pending && <Loader2 className="size-4 animate-spin"/>}{pending ? "Guardando..." : "Guardar cambios"}</button></div>
    </div>
  </form>;
}
