"use client";
import { useState,useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGymCategory,updateGymCategory } from "./actions";
type Category={id:number;dimension:string;slug:string;label:string;global:boolean;enabled:boolean};
const labels:Record<string,string>={discipline:"Disciplinas",objective:"Objetivos",level:"Niveles",audience:"Público"};
export default function CategoriesClient({initial,setupError}:{initial:Category[];setupError:string}){
 const router=useRouter();const [items,setItems]=useState(initial);const [dimension,setDimension]=useState("discipline");const [name,setName]=useState("");const [message,setMessage]=useState(setupError);const [pending,start]=useTransition();
 function create(){start(async()=>{const r=await createGymCategory(dimension,name);if(r.error){setMessage(r.error);return;}setMessage("Categoría guardada");setName("");router.refresh();window.location.reload();});}
 function toggle(item:Category){start(async()=>{const r=await updateGymCategory(item.id,!item.enabled);if(r.error){setMessage(r.error);return;}setItems(prev=>prev.map(x=>x.id===item.id?{...x,enabled:!x.enabled}:x));setMessage("");router.refresh();});}
 function rename(item:Category){const name=window.prompt("Nuevo nombre",item.label);if(name===null)return;start(async()=>{const r=await updateGymCategory(item.id,item.enabled,name);if(r.error){setMessage(r.error);return;}setItems(prev=>prev.map(x=>x.id===item.id?{...x,label:name.trim()}:x));router.refresh();});}
 return <div className="space-y-6 max-w-5xl">
 <div><h1 className="text-3xl font-bold">Categorías deportivas</h1><p className="text-muted-foreground">Configurá las categorías que podrán utilizar tus entrenadores. Las generales son opcionales.</p></div>
 {message&&<p role="status" className="border rounded-lg p-3">{message}</p>}
 <section className="rounded-xl border p-5 space-y-3"><h2 className="font-semibold">Nueva categoría del gimnasio</h2>
 <div className="flex flex-wrap gap-3">
 <select aria-label="Tipo de categoría" className="rounded border bg-background p-2" value={dimension} onChange={e=>setDimension(e.target.value)}>{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
 <input className="rounded border bg-background p-2 flex-1 min-w-40" placeholder="Nombre de la categoría" maxLength={80} value={name} onChange={e=>setName(e.target.value)}/>
 <button disabled={pending||!name.trim()} className="rounded bg-primary text-primary-foreground px-4 py-2 disabled:opacity-50" onClick={create}>Crear categoría</button></div></section>
 {Object.entries(labels).map(([key,label])=><section key={key} className="rounded-xl border p-5 space-y-3"><h2 className="text-lg font-semibold">{label}</h2>
 {items.filter(x=>x.dimension===key).length===0?<p className="text-sm text-muted-foreground">Todavía no hay categorías.</p>:items.filter(x=>x.dimension===key).map(item=><div key={item.id} className="flex items-center justify-between gap-3 border-b py-2 last:border-0"><div><p className="font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{item.global?"General de Kivra":"Propia del gimnasio"}</p></div><div className="flex items-center gap-3">{!item.global&&<button className="underline text-sm" disabled={pending} onClick={()=>rename(item)}>Editar</button>}<label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={pending} checked={item.enabled} onChange={()=>toggle(item)}/>Habilitada</label></div></div>)}</section>)}
 </div>
}
