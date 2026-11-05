"use client";
import {useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import {bookMyClass,cancelMyClass} from "@/app/miembro/clases/actions";
type S={id:number;day:number;start:string;end:string;room:string;name:string;capacity:number;trainer:string};
type B={id:number;scheduleId:number;date:string};
type M={start:string;end:string;mode:string;entries:number};
const days=["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
function fmt(d:Date){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")}
export default function MemberClasses({schedules,bookings,occupancy,memberships}:{schedules:S[];bookings:B[];occupancy:{scheduleId:number;date:string;occupied:number}[];memberships:M[]}) {
 const router=useRouter();const [busy,start]=useTransition();const [msg,setMsg]=useState("");
 const today=new Date();today.setHours(12,0,0,0);
 const dates=schedules.flatMap(s=>Array.from({length:5},(_,i)=>{const d=new Date(today);d.setDate(d.getDate()+(s.day-today.getDay()+7)%7+i*7);return {...s,date:fmt(d)}})).sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start));
 const eligible=(date:string)=>memberships.some(m=>m.start<=date&&date<m.end);
 function run(f:()=>Promise<{error?:string;success?:boolean}>){setMsg("");start(async()=>{try{const r=await f();setMsg(r.error||"Operación realizada correctamente.");if(r.success)router.refresh()}catch{setMsg("No se pudo completar la operación.")}})}
 return <div className="mx-auto max-w-5xl space-y-6 p-4"><div><h1 className="text-3xl font-bold">Mis clases</h1><p className="text-muted-foreground">Consultá horarios, cupos y reservá tu lugar.</p></div>
 {msg&&<p role="status" className="rounded-xl border p-3">{msg}</p>}
 <section className="rounded-2xl border bg-card p-5"><h2 className="mb-4 text-xl font-semibold">Mis próximas reservas</h2>{!bookings.length?<p className="text-muted-foreground">No tenés reservas confirmadas.</p>:bookings.map(b=>{const s=schedules.find(x=>x.id===b.scheduleId);return <div key={b.id} className="mb-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><strong>{s?.name||"Clase"} · {b.date}</strong><p className="text-sm text-muted-foreground">{s?.start} · {s?.trainer}</p></div><button disabled={busy} onClick={()=>run(()=>cancelMyClass(b.id))} className="rounded-lg border border-rose-500/40 px-3 py-2 text-rose-400">Cancelar reserva</button></div>})}</section>
 <section className="rounded-2xl border bg-card p-5"><h2 className="mb-4 text-xl font-semibold">Próximas clases</h2>{!dates.length?<p className="text-muted-foreground">No hay clases programadas.</p>:<div className="grid gap-3 md:grid-cols-2">{dates.map(s=>{const reserved=bookings.some(b=>b.scheduleId===s.id&&b.date===s.date);const occupied=occupancy.find(o=>o.scheduleId===s.id&&o.date===s.date)?.occupied||0;const allowed=eligible(s.date);return <div key={s.id+":"+s.date} className="rounded-xl border p-4"><div className="flex justify-between gap-2"><strong>{s.name}</strong><span className="text-sm text-primary">{Math.max(0,s.capacity-occupied)} cupos</span></div><p className="my-2 text-sm text-muted-foreground">{days[s.day]} {s.date} · {s.start}–{s.end}</p><p className="mb-3 text-xs text-muted-foreground">{s.trainer}{s.room?" · "+s.room:""}</p><button disabled={busy||reserved||!allowed||occupied>=s.capacity} onClick={()=>run(()=>bookMyClass(s.id,s.date))} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">{reserved?"Ya reservada":!allowed?"Membresía no habilitada":occupied>=s.capacity?"Sin cupos":"Reservar lugar"}</button></div>})}</div>}</section></div>;
}