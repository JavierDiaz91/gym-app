"use client";
import {useState} from "react";
import {saveBilling} from "./actions";
export default function BillingForm({days}:{days:string}) {
 const [busy,setBusy]=useState(false), [message,setMessage]=useState(""), [ok,setOk]=useState(false);
 return <form className="space-y-4" onSubmit={async e=>{e.preventDefault();const data=new FormData(e.currentTarget);setBusy(true);setMessage("");try{const r=await saveBilling(data);setOk(!!r.success);setMessage(r.success?"Plazo guardado correctamente.":r.error||"No se pudo guardar.");}catch{setOk(false);setMessage("No se pudo guardar.");}finally{setBusy(false);}}}>
 <label className="grid max-w-xs gap-2 text-sm font-medium">Días desde la emisión<input name="billing_due_days" type="number" min={1} max={90} step={1} required defaultValue={days} className="rounded-lg border border-border bg-background px-3 py-2"/></label>
 <p className="text-sm text-muted-foreground">Se aplica a nuevas facturas por período. No modifica facturas anteriores.</p>
 <button disabled={busy} className="rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground disabled:opacity-50">{busy?"Guardando...":"Guardar cambios"}</button>
 {message&&<p role="status" className={ok?"text-emerald-500":"text-destructive"}>{message}</p>}
 </form>;
}
