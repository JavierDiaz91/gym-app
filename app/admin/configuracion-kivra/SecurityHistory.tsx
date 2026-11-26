"use client";
import {useState} from "react";
type Event={id:string;date:string;action:string;result:string;ip:string;actor:string};
const labels:Record<string,string>={login:"Inicio de sesión",password_changed:"Cambio de contraseña",sessions_revoked:"Cierre de sesiones",identity_updated:"Identidad comercial",bank_updated:"Datos bancarios",billing_updated:"Condiciones de facturación"};
const zone="America/Argentina/Buenos_Aires";
export default function SecurityHistory({events}:{events:Event[]}){
 const [action,setAction]=useState("");const [result,setResult]=useState("");const [date,setDate]=useState("");
 const filtered=events.filter(e=>(!action||e.action===action)&&(!result||e.result===result)&&(!date||new Intl.DateTimeFormat("sv-SE",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(e.date))===date));
 const field="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";
 return <div className="space-y-4">
 <div className="grid gap-3 sm:grid-cols-3">
 <label className="grid gap-1 text-sm">Operación<select className={field} value={action} onChange={e=>setAction(e.target.value)}><option value="">Todas</option>{Object.entries(labels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
 <label className="grid gap-1 text-sm">Resultado<select className={field} value={result} onChange={e=>setResult(e.target.value)}><option value="">Todos</option><option value="success">Exitoso</option><option value="failure">Fallido</option></select></label>
 <label className="grid gap-1 text-sm">Fecha<input className={field} type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
 </div>
 <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"><span>{filtered.length} de {events.length} registros recientes · Hora argentina</span><button type="button" onClick={()=>{setAction("");setResult("");setDate("");}} className="text-primary">Limpiar filtros</button></div>
 {!filtered.length?<p className="rounded-lg border border-border p-5 text-sm text-muted-foreground">No hay actividad para mostrar.</p>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-border text-muted-foreground"><tr>{["Fecha y hora","Operación","Usuario","IP","Resultado"].map(v=><th key={v} className="whitespace-nowrap px-3 py-3 font-medium">{v}</th>)}</tr></thead><tbody>{filtered.map(e=><tr key={e.id} className="border-b border-border"><td className="whitespace-nowrap px-3 py-3">{new Date(e.date).toLocaleString("es-AR",{timeZone:zone})}</td><td className="px-3 py-3">{labels[e.action]||e.action}</td><td className="px-3 py-3">{e.actor}</td><td className="px-3 py-3">{e.ip||"No disponible"}</td><td className="px-3 py-3"><span className={e.result==="success"?"text-emerald-500":e.result==="failure"?"text-destructive":"text-muted-foreground"}>{e.result==="success"?"Exitoso":e.result==="failure"?"Fallido":"Sin datos"}</span></td></tr>)}</tbody></table></div>}
 </div>;
}
