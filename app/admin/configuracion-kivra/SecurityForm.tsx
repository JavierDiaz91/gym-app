"use client";
import {useState} from "react";
import {updateSecurity} from "./actions";
export default function SecurityForm(){
 const [mode,setMode]=useState<"password"|"revoke">("password");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 return <form key={mode} className="space-y-4" onSubmit={async e=>{e.preventDefault();const data=new FormData(e.currentTarget);if(!window.confirm("Se cerrarán todas tus sesiones. ¿Continuar?"))return;setBusy(true);setMessage("");try{const result=await updateSecurity(data);if(result.success){window.location.assign("/login");return;}setMessage(result.error||"No se pudo completar.");}catch{setMessage("No se pudo completar.");}finally{setBusy(false);}}}>
 <div className="flex flex-wrap gap-2">{(["password","revoke"] as const).map(value=><button key={value} type="button" disabled={busy} onClick={()=>{setMode(value);setMessage("");}} className={mode===value?"rounded-lg bg-primary px-4 py-2 text-primary-foreground":"rounded-lg border border-border px-4 py-2"}>{value==="password"?"Cambiar contraseña":"Cerrar todas las sesiones"}</button>)}</div>
 <input type="hidden" name="mode" value={mode}/>
 <div className="grid gap-4 sm:grid-cols-2">{(mode==="password"?[["current","Contraseña actual"],["next","Nueva contraseña"],["confirm","Confirmar contraseña"]]:[["current","Contraseña actual"]]).map(([name,label])=><label key={name} className="grid gap-2 text-sm font-medium">{label}<input name={name} type="password" required minLength={name==="current"?1:12} maxLength={name==="current"?256:72} autoComplete={name==="current"?"current-password":"new-password"} className="w-full rounded-lg border border-border bg-background px-3 py-2"/></label>)}</div>
 <p className="text-sm text-muted-foreground">Se cerrarán todas tus sesiones, incluida la actual.</p>
 <button disabled={busy} className="rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground disabled:opacity-50">{busy?"Procesando...":mode==="password"?"Actualizar contraseña":"Cerrar sesiones"}</button>
 {message&&<p role="alert" className="text-destructive">{message}</p>}
 </form>;
}
