"use client";
import { useState, useTransition } from "react";
import { saveMyTrainingSet } from "./actions";
import type { PlanDraft } from "@/app/trainer/rutinas/planes/actions";
type MyPlan = { id: number; snapshot: PlanDraft; startDate: string; version: number };
export default function MyPlanClient({ plan, error }: { plan: MyPlan | null; error: string }) {
  const [week, setWeek] = useState(0);
  const [day, setDay] = useState(0);
  const [pending, start] = useTransition();
  const [status, setStatus] = useState("");
  const [reps, setReps] = useState<Record<string,string>>({});
  const [loads, setLoads] = useState<Record<string,string>>({});
  if (error) return <p role="alert" className="p-6">{error}</p>;
  if (!plan) return <p className="p-6">Todavía no tenés una planificación asignada.</p>;
  const days = plan.snapshot.days || [];
  const weeks = Math.max(1, ...days.flatMap((d) => d.blocks.flatMap((b) => b.items.map((x) => x.prescriptions.length))));
  const current = days[day];
  return <main className="mx-auto max-w-4xl p-4 md:p-8 space-y-5">
    <h1 className="text-2xl font-bold">Mi planificación</h1>
    <div className="flex flex-wrap gap-2">{Array.from({length: weeks},(_,i)=><button key={i} className={"rounded-lg border px-3 py-2 " + (week===i?"border-cyan-500":"")} onClick={()=>setWeek(i)}>Semana {i+1}</button>)}</div>
    <div className="flex flex-wrap gap-2">{days.map((d,i)=><button key={i} className={"rounded-lg border px-3 py-2 " + (day===i?"border-cyan-500":"")} onClick={()=>setDay(i)}>{d.title}</button>)}</div>
    {current?.blocks.map((b,bi)=><section key={bi} className="rounded-xl border p-4 space-y-4">
      <h2 className="font-semibold">{b.title}</h2>
      {b.items.map((item,ii)=>{const rx=item.prescriptions[week] || {};const key=week+":"+day+":"+item.key;return <article key={item.key} className="space-y-2 rounded-lg bg-muted/30 p-3">
        {item.imageUrl && <img src={item.imageUrl} alt={"Demostración de "+item.title} className="h-40 w-full max-w-sm rounded-lg object-contain" />}
        <h3 className="font-semibold">{item.title}</h3><p className="text-sm text-muted-foreground">{item.instructions}</p>
        <p className="text-sm">Series: {rx.sets ?? "—"} · Reps: {rx.reps || "—"} · RIR: {rx.rir || "—"} · Descanso: {rx.restSeconds ?? "—"} s · Tempo: {rx.tempo || "—"}</p>
        {(rx.distanceMeters || rx.durationSeconds || rx.pace) && <p className="text-sm">Distancia: {rx.distanceMeters || "—"} m · Tiempo: {rx.durationSeconds || "—"} s · Ritmo: {rx.pace || "—"}</p>}
        {rx.notes && <p className="text-sm">{rx.notes}</p>}
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-xs">Reps realizadas<input type="number" min={0} className="block w-28 rounded-lg border bg-background p-2" value={reps[key]||""} onChange={(e)=>setReps((p)=>({...p,[key]:e.target.value}))}/></label>
          <label className="text-xs">Carga (kg)<input type="number" min={0} step="0.5" className="block w-28 rounded-lg border bg-background p-2" value={loads[key]||""} onChange={(e)=>setLoads((p)=>({...p,[key]:e.target.value}))}/></label>
          <button disabled={pending} className="rounded-lg border px-3 py-2 text-sm" onClick={()=>start(async()=>{const result=await saveMyTrainingSet(plan.id,day+1,week+1,item.key,1,reps[key]?Number(reps[key]):null,loads[key]?Number(loads[key]):null);setStatus(result.success?"Serie registrada":result.error||"Error");})}>Registrar serie 1</button>
        </div>
      </article>})}
    </section>)}
    {status && <p role="status" className="text-sm">{status}</p>}
  </main>;
}
