import Link from "next/link";
import { getSession } from "@/app/actions";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { Calendar, CheckCircle2, Dumbbell, History, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Entry = {id:string; title:string; subtitle:string; completedAt:string; href:string; kind:"plan"|"routine"};
type PlanDay = {title?:string};
const dateLabel=(value:string)=>new Intl.DateTimeFormat("es-AR",{timeZone:"America/Argentina/Buenos_Aires",day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(value));

export default async function MemberHistoryPage() {
 const session=await getSession();
 if(!session||session.role!=="member"||session.gymId==null)redirect("/login");
 const members=await sql`SELECT id FROM members WHERE user_id=${session.id} AND gym_id=${session.gymId} LIMIT 1`;
 const memberId=members[0]?.id;
 const entries:Entry[]=[];
 if(memberId){
  const [routineLogs,planLogs]=await Promise.all([
   sql`SELECT wl.id,wl.completed_at,r.title AS routine_title FROM workout_logs wl
    JOIN routines r ON r.id=wl.routine_id
    WHERE wl.member_id=${memberId}
    ORDER BY wl.completed_at DESC`,
   sql`SELECT ws.id,ws.member_training_plan_id,ws.week_number,ws.day_index,ws.finished_at,
     mtp.snapshot_jsonb,COALESCE(tp.title,'Plan de entrenamiento') AS plan_title
     FROM workout_sessions ws
     JOIN member_training_plans mtp ON mtp.id=ws.member_training_plan_id
     LEFT JOIN training_plans tp ON tp.id=mtp.source_plan_id AND tp.gym_id=mtp.gym_id
     WHERE ws.member_id=${memberId} AND mtp.member_id=${memberId}
      AND mtp.gym_id=${session.gymId} AND ws.status='completed' AND ws.finished_at IS NOT NULL
     ORDER BY ws.finished_at DESC`
  ]);
  for(const log of routineLogs)entries.push({id:`routine-${log.id}`,title:String(log.routine_title||"Rutina completada"),subtitle:"Rutina individual",completedAt:String(log.completed_at),href:"/miembro",kind:"routine"});
  for(const log of planLogs){
   const days=log.snapshot_jsonb?.days as PlanDay[]|undefined;
   const day=Array.isArray(days)?days[Number(log.day_index)-1]:undefined;
   entries.push({id:`plan-${log.id}`,title:String(log.plan_title),subtitle:`Semana ${log.week_number} · Día ${log.day_index}${day?.title?` · ${day.title}`:""}`,completedAt:String(log.finished_at),href:`/miembro/rutina?plan=${log.member_training_plan_id}`,kind:"plan"});
  }
  entries.sort((a,b)=>new Date(b.completedAt).getTime()-new Date(a.completedAt).getTime());
 }
 return <div className="mx-auto max-w-4xl space-y-6">
  <div><h1 className="flex items-center gap-2 text-2xl font-bold"><History className="h-6 w-6 text-cyan-400"/>Historial de entrenamientos</h1><p className="mt-1 text-sm text-slate-400">Tus rutinas y sesiones de planes multisemana finalizadas.</p></div>
  {entries.length===0?<div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center"><Dumbbell className="mx-auto mb-4 h-10 w-10 text-slate-500"/><h2 className="text-lg font-semibold">Sin entrenamientos registrados</h2><p className="mt-2 text-sm text-slate-400">Cuando finalices una rutina o sesión de tu plan, aparecerá acá.</p></div>:
  <div className="space-y-3">{entries.map(entry=><div key={entry.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5"><div className="flex items-start gap-3"><div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400"><CheckCircle2 className="h-5 w-5"/></div><div><p className="text-xs font-semibold uppercase tracking-wide text-cyan-400">{entry.kind==="plan"?"Plan multisemana":"Rutina"}</p><h2 className="font-semibold">{entry.title}</h2><p className="mt-1 text-sm text-slate-400">{entry.subtitle}</p><p className="mt-2 flex items-center gap-2 text-xs text-slate-400"><Calendar className="h-4 w-4"/>{dateLabel(entry.completedAt)}</p></div></div><Link href={entry.href} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-cyan-400 hover:border-cyan-500">Ver plan <ArrowRight className="h-4 w-4"/></Link></div>)}</div>}
 </div>;
}
