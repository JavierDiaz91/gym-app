"use client";
import { useEffect, useRef, useState } from "react";
import { getClassBookings,reserveGymClass,cancelGymClassBooking } from "@/app/class-booking-actions";

type Schedule={id:number;class_id:number;day_of_week:number;start_time:string;is_active:boolean};
type ClassItem={id:number;name:string;is_active:boolean};
type Data=Awaited<ReturnType<typeof getClassBookings>>;
function nextDate(day:number) {
 const d=new Date();const diff=(day-d.getDay()+7)%7;d.setDate(d.getDate()+diff);
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
}
export default function ClassBookings({schedules,classes,target}:{schedules:Schedule[];classes:ClassItem[];target?:{scheduleId:number;date:string;key:number}|null}) {
 const available=schedules.filter(s=>s.is_active&&classes.some(c=>c.id===s.class_id&&c.is_active));
 const [scheduleId,setScheduleId]=useState(available[0]?.id??0);
 const selected=available.find(s=>s.id===scheduleId);
 const [date,setDate]=useState(selected?nextDate(selected.day_of_week):"");
 const [data,setData]=useState<Data|null>(null);
 const [memberId,setMemberId]=useState(0);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const sectionRef=useRef<HTMLElement>(null);
 useEffect(()=>{if(!target)return;setScheduleId(target.scheduleId);setDate(target.date);setData(null);setMemberId(0);setMessage("");let active=true;setBusy(true);getClassBookings(target.scheduleId,target.date).then(result=>{if(active)setData(result)}).catch(()=>{if(active)setMessage("No se pudieron cargar las reservas")}).finally(()=>{if(active)setBusy(false)});sectionRef.current?.scrollIntoView({behavior:"smooth",block:"start"});return()=>{active=false}},[target]);
 const input="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white";
 async function load(id=scheduleId,day=date){setBusy(true);setMessage("");try{setData(await getClassBookings(id,day))}catch{setData(null);setMessage("No se pudieron cargar las reservas")}finally{setBusy(false)}}
 async function reserve(){setBusy(true);try{const r=await reserveGymClass(scheduleId,memberId,date);if(r.error)setMessage(r.error);else await load()}catch{setMessage("Error al reservar")}finally{setBusy(false)}}
 async function cancel(id:number){setBusy(true);try{const r=await cancelGymClassBooking(id);if(r.error)setMessage(r.error);else await load()}catch{setMessage("Error al cancelar")}finally{setBusy(false)}}
 return <section ref={sectionRef} id="reservas-y-cupos" className="scroll-mt-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
 <div><h2 className="text-xl font-bold">Reservas y cupos</h2><p className="text-sm text-slate-400">Consultá las inscripciones por fecha o seleccioná una clase del calendario semanal. Cada día tiene cupos independientes.</p></div>
 {!available.length?<p className="text-slate-400">Primero programá un horario activo.</p>:<>
 <div className="flex flex-wrap items-end gap-3"><label className="flex flex-col gap-1 text-sm">Horario<select className={input} value={scheduleId} onChange={e=>{const id=Number(e.target.value);setScheduleId(id);setDate(nextDate(available.find(s=>s.id===id)!.day_of_week));setData(null);setMessage("")}}>{available.map(s=><option key={s.id} value={s.id}>{classes.find(c=>c.id===s.class_id)?.name} · {["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"][s.day_of_week]} {s.start_time.slice(0,5)}</option>)}</select></label>
 <label className="flex flex-col gap-1 text-sm">Fecha<input className={input} type="date" value={date} min={new Date().toLocaleDateString("en-CA")} onChange={e=>{setDate(e.target.value);setData(null)}}/></label>
 <button className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50" disabled={busy||!date} onClick={()=>load()}>Consultar cupos</button></div>
 {data&&<><p className="font-semibold text-cyan-400">{data.bookings.length} / {data.capacity} cupos ocupados · {Math.max(0,data.capacity-data.bookings.length)} disponibles</p>
 <div className="flex flex-wrap gap-2"><select className={input} value={memberId} onChange={e=>setMemberId(Number(e.target.value))}><option value={0}>Seleccionar alumno</option>{data.members.filter(m=>!data.bookings.some(b=>b.memberId===m.id)).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select><button className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50" disabled={busy||!memberId||data.bookings.length>=data.capacity} onClick={reserve}>Reservar lugar</button></div>
 <div className="space-y-2">{data.bookings.length===0?<p className="text-sm text-slate-400">No hay alumnos inscriptos para esta fecha.</p>:data.bookings.map(b=><div key={b.id} className="flex justify-between rounded-lg border border-slate-800 p-3"><span>{b.name}</span><button disabled={busy} className="text-rose-300 disabled:opacity-50" onClick={()=>cancel(b.id)}>Cancelar reserva</button></div>)}</div></>}
 {message&&<p role="alert" className="text-sm text-rose-400">{message}</p>}
 </>}</section>;
}
