"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Flame, Trophy } from "lucide-react";

type Session = { id: string; completedAt: string };
type Props = { sessions: Session[]; weeklyTarget: number };
const DAY_MS = 86400000;
const zone = "America/Argentina/Buenos_Aires";
const dateKey = (value: string | Date) => new Intl.DateTimeFormat("en-CA", {timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(value));
function mondayOf(key: string) {
  const date = new Date(key+"T12:00:00Z");
  const offset = (date.getUTCDay()+6)%7;
  date.setUTCDate(date.getUTCDate()-offset);
  return date;
}
const addDays = (d:Date,n:number)=>new Date(d.getTime()+n*DAY_MS);
const dayKey=(d:Date)=>d.toISOString().slice(0,10);
const shortDate=(d:Date)=>new Intl.DateTimeFormat("es-AR",{day:"numeric",month:"short",timeZone:"UTC"}).format(d);
const level=(count:number)=>count>=40?{name:"Élite",min:40,next:null}:count>=20?{name:"Avanzado",min:20,next:40}:count>=10?{name:"Constante",min:10,next:20}:count>=4?{name:"En progreso",min:4,next:10}:{name:"Principiante",min:0,next:4};

export default function WeeklyProgress({sessions,weeklyTarget}:Props) {
  const [offset,setOffset]=useState(0);
  const today=dateKey(new Date());
  const currentMonday=mondayOf(today);
  const monday=addDays(currentMonday,offset*7);
  const weekDays=Array.from({length:7},(_,i)=>dayKey(addDays(monday,i)));
  const counts=useMemo(()=>{
    const map=new Map<string,number>();
    for(const session of sessions){
      const key=dateKey(session.completedAt);
      map.set(key,(map.get(key)||0)+1);
    }
    return map;
  },[sessions]);
  const values=weekDays.map(day=>counts.get(day)||0);
  const completed=values.reduce((a,b)=>a+b,0);
  const goal=Math.max(1,weeklyTarget);
  const percent=Math.min(100,Math.round(completed/goal*100));
  const total=sessions.length;
  const rank=level(total);
  const progress=rank.next===null?100:Math.min(100,Math.round((total-rank.min)/(rank.next-rank.min)*100));
  const activeDays=values.filter(x=>x>0).length;
  const max=Math.max(1,...values);
  return <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-bold">Mi progreso</h2><p className="text-sm text-slate-400">Actividad registrada y constancia de entrenamiento.</p></div>
      <span className="rounded-full border border-cyan-800/60 bg-cyan-950/30 px-3 py-1 text-xs font-semibold text-cyan-300">{percent}% de la meta semanal</span>
    </div>
    <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
      {[{value:String(completed),label:"Sesiones esta semana"},{value:String(activeDays),label:"Días activos"},{value:String(total),label:"Sesiones históricas"}].map(item=><div key={item.label} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3"><p className="text-xl font-bold text-cyan-400 sm:text-2xl">{item.value}</p><p className="mt-1 text-xs text-slate-400">{item.label}</p></div>)}
    </div>
    <div className="mt-6 flex items-center justify-between gap-2">
      <button type="button" onClick={()=>setOffset(v=>v-1)} className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-cyan-500" aria-label="Semana anterior"><ChevronLeft className="h-4 w-4"/></button>
      <div className="text-center text-sm font-medium text-slate-200">{shortDate(monday)} – {shortDate(addDays(monday,6))}</div>
      <button type="button" onClick={()=>setOffset(v=>Math.min(0,v+1))} disabled={offset>=0} className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Semana siguiente"><ChevronRight className="h-4 w-4"/></button>
    </div>
    <div className="mt-4 grid grid-cols-7 gap-2 sm:gap-4" role="img" aria-label={`Sesiones completadas por día: ${values.join(", ")}`}>
      {values.map((count,i)=><div key={weekDays[i]} className="flex flex-col items-center gap-2">
        <div className="flex h-24 w-full items-end justify-center rounded-lg bg-slate-900/30 py-1">
          <div className="relative h-full w-[9px] overflow-hidden rounded-full bg-slate-800">
            {count>0&&<div className="absolute bottom-0 w-full rounded-full bg-gradient-to-t from-cyan-700 to-cyan-400" style={{height:`${Math.max(12,count/max*100)}%`}}/>}
          </div>
        </div>
        <span className="text-xs text-slate-400">{["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"][i]}</span>
        <span className="text-xs font-semibold text-cyan-300">{count||"–"}</span>
      </div>)}
    </div>
    <p className="mt-3 text-xs text-slate-400">{completed} de {goal} sesiones de referencia esta semana. {weeklyTarget===0?"Meta inicial sugerida: 3 sesiones.":"Meta basada en los días de tus planes asignados."}</p>
    <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-cyan-400"/><span className="text-sm font-semibold">Nivel de constancia · {rank.name}</span></div>
        <span className="text-xs font-semibold text-cyan-400">{progress}%</span>
      </div>
      <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-400 transition-all" style={{width:`${progress}%`}}/></div>
      <p className="mt-2 flex items-center gap-2 text-xs text-slate-400"><Flame className="h-3.5 w-3.5"/>{rank.next===null?"Alcanzaste el nivel máximo de constancia.":`${rank.next-total} sesiones más para el siguiente nivel.`} Los niveles miden constancia, no rendimiento físico.</p>
    </div>
  </section>;
}
