"use client";
import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {Bell,CheckCheck,RefreshCw} from "lucide-react";
import {Sheet,SheetContent,SheetTitle,SheetDescription,SheetTrigger} from "@/components/ui/sheet";
type Item={id:string;title:string;message:string;event_type:string;action_url:string|null;read_at:string|null;created_at:string};
export function NotificationCenter(){
 const [open,setOpen]=useState(false),[items,setItems]=useState<Item[]>([]),[unread,setUnread]=useState(0),[error,setError]=useState(""),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
 const load=useCallback(async()=>{try{const r=await fetch("/api/admin/notifications",{cache:"no-store"});if(!r.ok)throw Error();const d=await r.json();setItems(d.items);setUnread(d.unread);setError("");setLoaded(true);}catch{setError("No se pudieron cargar las notificaciones.");}},[]);
 useEffect(()=>{void load();const timer=setInterval(()=>{if(document.visibilityState==="visible")void load();},60000);return()=>clearInterval(timer);},[load]);
 async function mark(body:{id:string}|{all:true}){setBusy(true);try{const r=await fetch("/api/admin/notifications",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});if(!r.ok)throw Error();await load();}catch{setError("No se pudo marcar como leída.");}finally{setBusy(false);}}
 return <Sheet open={open} onOpenChange={v=>{setOpen(v);if(v)void load();}}>
 <SheetTrigger asChild><button type="button" aria-label={`Notificaciones, ${unread} sin leer`} className="relative flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground"><Bell className="size-5"/>{unread>0&&<span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">{unread>99?"99+":unread}</span>}</button></SheetTrigger>
 <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto bg-background text-foreground p-4 sm:p-6">
 <SheetTitle>Notificaciones</SheetTitle><SheetDescription>Actividad de tu gimnasio</SheetDescription>
 <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm text-muted-foreground">{unread} sin leer</span><button type="button" disabled={busy||!unread} onClick={()=>void mark({all:true})} className="flex items-center gap-1 text-sm text-primary disabled:opacity-50"><CheckCheck className="size-4"/> Marcar todas</button><button type="button" aria-label="Actualizar" onClick={()=>void load()}><RefreshCw className="size-4"/></button></div>
 {error&&<p role="alert" className="text-sm text-red-500">{error}</p>}
 {!loaded&&!error&&<p className="text-sm text-muted-foreground">Cargando...</p>}
 {loaded&&!items.length&&<div className="rounded-xl border p-6 text-center text-muted-foreground"><Bell className="mx-auto mb-2 size-6"/>No hay notificaciones todavía.</div>}
 <div className="space-y-2">{items.map(i=><article key={i.id} className={`rounded-xl border p-3 space-y-2 ${i.read_at?"bg-card":"bg-primary/5 border-primary/30"}`}><div className="flex items-start gap-2"><Bell className="mt-1 size-4 shrink-0 text-primary"/><div className="min-w-0 flex-1"><p className="font-semibold break-words">{i.title}</p><p className="text-sm text-muted-foreground break-words">{i.message}</p></div></div><p className="text-xs text-muted-foreground">{new Date(i.created_at).toLocaleString("es-AR")}</p><div className="flex flex-wrap gap-3 text-sm">{!i.read_at&&<button disabled={busy} onClick={()=>void mark({id:i.id})} className="text-primary">Marcar como leída</button>}{i.action_url&&/^\/admin\/(miembros|pagos|clases|membresias)(\/|$)/.test(i.action_url)&&<Link href={i.action_url} onClick={()=>setOpen(false)} className="text-primary">Ver detalle</Link>}</div></article>)}</div>
 </SheetContent></Sheet>;
}
