"use client";
import {useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import {bookMyClass,cancelMyClass} from "@/app/miembro/clases/actions";
type S={id:number;day:number;start:string;end:string;room:string;name:string;capacity:number;trainer:string};
type B={id:number;scheduleId:number;date:string};
type M={start:string;end:string;mode:string;entries:number};
const weekday=["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const months=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
function fmt(d:Date){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")}
function label(date:string){const [y,m,d]=date.split("-").map(Number);const x=new Date(y,m-1,d,12);return weekday[x.getDay()]+" "+d+" de "+months[m-1]}
export default function MemberClasses({schedules,bookings,occupancy,memberships}:{schedules:S[];bookings:B[];occupancy:{scheduleId:number;date:string;occupied:number}[];memberships:M[]}) {
 const router=useRouter();const [busy,start]=useTransition();const [msg,setMsg]=useState("");
 const [week,setWeek]=useState(0);const [selected,setSelected]=useState<string|null>(null);
 const today=new Date();today.setHours(12,0,0,0);
 const todayKey=fmt(today);
 const monday=new Date(today);monday.setDate(today.getDate()-(today.getDay()+6)%7+week*7);
 const weekDates=Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(monday.getDate()+i);return {key:fmt(d),day:d.getDay(),short:weekday[d.getDay()],num:d.getDate()}});
 const availableDays=weekDates.filter(d=>d.key>=todayKey);
 const selectedDay=availableDays.some(d=>d.key===selected)?selected:availableDays[0]?.key;
 const daily=selectedDay?schedules.filter(s=>s.day===weekDates.find(d=>d.key===selectedDay)?.day).sort((a,b)=>a.start.localeCompare(b.start)):[];
 const eligible=(date:string)=>memberships.some(m=>m.start<=date&&date<m.end);
 function run(f:()=>Promise<{error?:string;success?:boolean}>){setMsg("");start(async()=>{try{const result=await f();setMsg(result.error||"Operación realizada correctamente.");if(result.success)router.refresh()}catch{setMsg("No se pudo completar la operación.")}})}
 return <div className="mx-auto max-w-5xl space-y-6 p-4">
  <div><h1 className="text-3xl font-bold">Mis clases</h1><p className="text-muted-foreground">Elegí un día para consultar horarios, cupos y reservar tu lugar.</p></div>
  {msg&&<p role="status" className="rounded-xl border p-3">{msg}</p>}
  <section className="rounded-2xl border bg-card p-5">
   <h2 className="mb-4 text-xl font-semibold">Calendario de clases</h2>
   <div className="mb-4 flex items-center justify-between gap-3">
    <button type="button" disabled={week===0} onClick={()=>{setWeek(w=>Math.max(0,w-1));setSelected(null)}} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">← Anterior</button>
    <span className="text-center text-sm font-medium">{label(weekDates[0].key)} – {label(weekDates[6].key)}</span>
    <button type="button" disabled={week===7} onClick={()=>{setWeek(w=>Math.min(7,w+1));setSelected(null)}} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Siguiente →</button>
   </div>
   <div className="mb-5 grid grid-cols-7 gap-1 sm:gap-2" aria-label="Seleccionar día">
    {weekDates.map(d=>{const hasClass=schedules.some(s=>s.day===d.day);const hasBooking=bookings.some(b=>b.date===d.key);return <button type="button" key={d.key} disabled={d.key<todayKey} aria-pressed={selectedDay===d.key} aria-label={`${label(d.key)}${hasBooking?", reserva confirmada":hasClass?", clases disponibles":", sin clases"}`} onClick={()=>setSelected(d.key)} className={`min-w-0 rounded-xl border px-1 py-3 text-center text-xs sm:text-sm ${selectedDay===d.key?"border-primary bg-primary text-primary-foreground":"bg-background hover:border-primary/60"} disabled:cursor-not-allowed disabled:opacity-30`}><span className="block">{d.short}</span><strong className="mt-1 block text-base">{d.num}</strong><span className="mt-1 flex h-3 items-center justify-center" aria-hidden="true">{hasBooking?<span className={`h-2 w-2 rounded-full ${selectedDay===d.key?"bg-primary-foreground":"bg-emerald-400"}`}/>:hasClass?<span className={`h-1.5 w-1.5 rounded-full ${selectedDay===d.key?"bg-primary-foreground":"bg-cyan-400"}`}/>:null}</span></button>})}
   </div>
   <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground"><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-cyan-400"/>Día con clases</span><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400"/>Reserva confirmada</span></div>
   <h3 className="mb-3 font-semibold">{selectedDay?label(selectedDay):"Seleccioná una fecha"}</h3>
   {!daily.length?<p className="rounded-xl border p-5 text-sm text-muted-foreground">No hay clases programadas para este día.</p>:<div className="grid gap-3 sm:grid-cols-2">{daily.map(s=>{const reserved=bookings.some(b=>b.scheduleId===s.id&&b.date===selectedDay);const occupied=occupancy.find(o=>o.scheduleId===s.id&&o.date===selectedDay)?.occupied||0;const remaining=Math.max(0,s.capacity-occupied);const allowed=eligible(selectedDay!);return <article key={s.id} className="rounded-xl border p-4"><div className="flex items-center justify-between gap-2"><strong>{s.name}</strong><span className="text-sm text-primary">{remaining} {remaining===1?"cupo disponible":"cupos disponibles"}</span></div><p className="mt-2 text-sm text-muted-foreground">{s.start} a {s.end}</p><p className="mb-3 text-sm text-muted-foreground">{s.trainer}{s.room?" · "+s.room:""}</p><button type="button" disabled={busy||reserved||!allowed||remaining===0} onClick={()=>run(()=>bookMyClass(s.id,selectedDay!))} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">{reserved?"Ya reservada":!allowed?"Membresía no habilitada":remaining===0?"Sin cupos":"Reservar lugar"}</button>{!allowed&&!reserved&&<p className="mt-2 text-xs text-muted-foreground">No tenés una membresía pagada y vigente para esta fecha.</p>}</article>})}</div>}
  </section>
  <section className="rounded-2xl border bg-card p-5"><h2 className="mb-4 text-xl font-semibold">Mis próximas reservas</h2>{!bookings.length?<p className="text-sm text-muted-foreground">No tenés reservas confirmadas.</p>:bookings.map(b=>{const s=schedules.find(x=>x.id===b.scheduleId);return <div key={b.id} className="mb-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><strong>{s?.name||"Clase"} · {label(b.date)}</strong><p className="text-sm text-muted-foreground">{s?.start} · {s?.trainer}</p></div><button type="button" disabled={busy} onClick={()=>run(()=>cancelMyClass(b.id))} className="rounded-lg border border-rose-500/40 px-3 py-2 text-rose-400 disabled:opacity-40">Cancelar reserva</button></div>})}</section>
 </div>;
}
