"use client";
import {useState} from "react";
import {saveBank} from "./actions";
export default function BankForm({values}:{values:Record<string,string>}) {
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [ok,setOk]=useState(false);
 const fields=[["bank_name","Banco",100],["bank_account_holder","Titular de la cuenta",150],["bank_cbu","CBU / CVU",22],["bank_alias","Alias",100]] as const;
 return <form className="space-y-5" onSubmit={async e=>{e.preventDefault();const data=new FormData(e.currentTarget);setBusy(true);setMessage("");try{const result=await saveBank(data);setOk(!!result.success);setMessage(result.success?"Datos bancarios guardados correctamente.":result.error||"No se pudo guardar.");}catch{setOk(false);setMessage("No se pudo guardar.");}finally{setBusy(false);}}}>
 <div className="grid gap-4 sm:grid-cols-2">{fields.map(([key,label,max])=><label key={key} className="grid gap-2 text-sm font-medium">{label}<input className="w-full rounded-lg border border-border bg-background px-3 py-2" name={key} defaultValue={values[key]||""} maxLength={max} inputMode={key==="bank_cbu"?"numeric":"text"} type="text"/></label>)}</div>
 <button disabled={busy} className="rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground disabled:opacity-50">{busy?"Guardando...":"Guardar cambios"}</button>
 {message&&<p role="status" className={ok?"text-emerald-500":"text-destructive"}>{message}</p>}
 </form>;
}
