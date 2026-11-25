"use client";
import {useState} from "react";
import {saveIdentity} from "./actions";
export default function IdentityForm({values}:{values:Record<string,string>}) {
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [ok,setOk]=useState(false);
 const fields=[["platform_name","Nombre de plataforma",100],["tagline","Eslogan",255],["website_url","Sitio web",2048],["support_email","Correo de soporte",254],["support_phone","Teléfono de soporte",50],["business_name","Razón social",150],["tax_id","CUIT",30]] as const;
 return <form className="space-y-5" onSubmit={async e=>{e.preventDefault();const data=new FormData(e.currentTarget);setBusy(true);setMessage("");try{const result=await saveIdentity(data);setOk(!!result.success);setMessage(result.success?"Configuración guardada correctamente.":result.error||"No se pudo guardar.");}catch{setOk(false);setMessage("No se pudo guardar.");}finally{setBusy(false);}}}>
 <div className="grid gap-4 sm:grid-cols-2">{fields.map(([key,label,max])=><label key={key} className="grid gap-2 text-sm font-medium">{label}<input className="w-full rounded-lg border border-border bg-background px-3 py-2" name={key} defaultValue={values[key]||""} maxLength={max} required={key==="platform_name"||key==="tagline"} type={key==="support_email"?"email":key==="website_url"?"url":"text"}/></label>)}</div>
 <button disabled={busy} className="rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground disabled:opacity-50">{busy?"Guardando...":"Guardar cambios"}</button>
 {message&&<p role="status" className={ok?"text-emerald-500":"text-destructive"}>{message}</p>}
 </form>;
}
