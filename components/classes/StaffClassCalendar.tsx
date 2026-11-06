"use client";
import {useEffect,useMemo,useState} from "react";
import {getWeeklyClassOccupancy} from "@/app/clases-actions";
import ClassBookings from "./ClassBookings";
type C={id:number;name:string;capacity:number;is_active:boolean};
type S={id:number;class_id:number;day_of_week:number;start_time:string;end_time:string;room:string|null;is_active:boolean};
type O={scheduleId:number;date:string;occupied:number};
const days=["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
function iso(d:Date){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")}
function monday(d:Date){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-(x.getDay()+6)%7);return x}
function add(d:Date,n:number){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function format(d:Date){return d.toLocaleDateString("es-AR",{day:"numeric",month:"long"})}
export default function StaffClassCalendar({classes,schedules,onEdit}:{classes:C[];schedules:S[];onEdit:(s:S)=>void}){
 const [week,setWeek]=useState(()=>monday(new Date()));
 const [selected,setSelected]=useState(()=>iso(new Date()));
 const [occupancy,setOccupancy]=useState<O[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [target,setTarget]=useState<{scheduleId:number;date:string;key:number}|null>(null);
 const start=iso(week);
 useEffect(()=>{let alive=true;setLoading(true);setError("");getWeeklyClassOccupancy(start).then(rows=>{if(alive)setOccupancy(rows)}).catch(()=>{if(alive)setError("No se pudieron consultar los cupos");}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[start,target?.key]);
 const dates=useMemo(()=>Array.from({length:7},(_,i)=>add(week,i)),[week]);
 const active=schedules.filter(s=>s.is_active&&classes.some(c=>c.id===s.class_id&&c.is_active));
 const today=iso(new Date());
 const daySchedules=active.filter(s=>s.day_of_week===new Date(selected+"T12:00:00").getDay()).sort((a,b)=>a.start_time.localeCompare(b.start_time));
 function changeWeek(offset:number){const next=add(week,offset*7);setWeek(next);setSelected(iso(next)<today&&iso(add(next,6))>=today?today:iso(next));setTarget(null)}
 return <div className="space-y-5">
 <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
 <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Calendario de clases</h2><p className="text-sm text-slate-400">Seleccioná un día para ver horarios, disponibilidad y reservas.</p></div><span className="rounded-full border border-cyan-900 bg-cyan-950/40 px-3 py-1 text-xs text-cyan-300">{active.length} horarios semanales</span></div>
 <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><button type="button" className="rounded-xl border border-slate-800 px-3 py-2 text-sm hover:border-cyan-700" onClick={()=>changeWeek(-1)}>← Anterior</button><strong className="text-sm">{format(week)} – {format(add(week,6))}</strong><button type="button" className="rounded-xl border border-slate-800 px-3 py-2 text-sm hover:border-cyan-700" onClick={()=>changeWeek(1)}>Siguiente →</button></div>
 <div className="grid grid-cols-7 gap-2">{dates.map((date,i)=>{const value=iso(date);const count=active.filter(s=>s.day_of_week===date.getDay()).length;return <button type="button" key={value} onClick={()=>{setSelected(value);setTarget(null)}} aria-pressed={selected===value} className={`min-h-20 rounded-xl border px-1 py-3 text-center transition-colors ${selected===value?"border-cyan-400 bg-cyan-400 text-slate-950":"border-slate-800 bg-slate-950 hover:border-cyan-800"}`}><span className="block text-xs">{days[i]}</span><strong className="block text-lg">{date.getDate()}</strong>{count>0&&<span className={`mx-auto mt-1 block h-1.5 w-1.5 rounded-full ${selected===value?"bg-slate-950":"bg-cyan-400"}`}/>}</button>})}</div>
 <div className="mt-3 flex gap-4 text-xs text-slate-400"><span><span className="text-cyan-400">●</span> Día con clases</span><span>Los horarios se repiten semanalmente</span></div>
 <h3 className="mb-3 mt-6 font-semibold capitalize">{new Date(selected+"T12:00:00").toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"})}</h3>
 {error&&<p role="alert" className="mb-3 text-sm text-rose-400">{error}</p>}
 {daySchedules.length===0?<p className="rounded-xl border border-slate-800 p-5 text-sm text-slate-400">No hay clases programadas para este día.</p>:<div className="grid gap-3 md:grid-cols-2">{daySchedules.map(s=>{const c=classes.find(c=>c.id===s.class_id)!;const used=occupancy.find(o=>o.scheduleId===s.id&&o.date===selected)?.occupied??0;const free=Math.max(0,c.capacity-used);return <div key={s.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><div className="flex justify-between gap-2"><strong>{c.name}</strong><span className={`text-sm ${free===0?"text-rose-400":"text-cyan-400"}`}>{loading?"Consultando…":`${used}/${c.capacity} ocupados`}</span></div><p className="mt-2 text-sm text-slate-400">{s.start_time.slice(0,5)} a {s.end_time.slice(0,5)}{s.room?` · ${s.room}`:""}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className={free===0?"h-full bg-rose-400":"h-full bg-cyan-400"} style={{width:`${Math.min(100,used/Math.max(1,c.capacity)*100)}%`}}/></div><p className="mt-2 text-xs text-slate-400">{free===0?"Clase completa":`${free} cupos disponibles`}</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300" onClick={()=>setTarget(prev=>({scheduleId:s.id,date:selected,key:(prev?.key??0)+1}))}>Ver reservas</button><button type="button" className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:border-cyan-700" onClick={()=>onEdit(s)}>Editar horario</button></div></div>})}</div>}
 </section>
 {target&&<ClassBookings key={target.key} schedules={schedules} classes={classes} target={target}/>}
 </div>
}
