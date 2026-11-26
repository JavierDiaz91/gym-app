"use client";
import { useState } from "react";
import { CreditCard, Landmark } from "lucide-react";
import { savePaymentMethods } from "./payment-actions";

export default function PaymentMethodsForm({mpEnabled, bankEnabled}:{mpEnabled:boolean;bankEnabled:boolean}) {
 const [mp,setMp]=useState(mpEnabled);
 const [bank,setBank]=useState(bankEnabled);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [ok,setOk]=useState(false);
 return <form className="space-y-4" onSubmit={async e=>{
  e.preventDefault(); setBusy(true); setMessage("");
  try {const result=await savePaymentMethods(mp,bank);setOk(!!result.success);setMessage(result.success?"Medios de cobro guardados correctamente.":result.error||"No se pudo guardar.");}
  catch {setOk(false);setMessage("No se pudo guardar.");}
  finally {setBusy(false);}
 }}>
 {([{label:"Mercado Pago",description:"Acreditación automática · Modo pruebas",Icon:CreditCard,checked:mp,set:setMp},{label:"Transferencia bancaria",description:"Acreditación mediante aprobación manual",Icon:Landmark,checked:bank,set:setBank}]).map(({label,description,Icon,checked,set})=>
 <label key={label} className="flex items-center gap-3 border-t border-border py-4">
 <Icon className="size-6 shrink-0 text-primary"/>
 <span className="min-w-0 flex-1"><span className="block font-semibold">{label}</span><span className="block text-sm text-muted-foreground">{description}</span></span>
 <input type="checkbox" role="switch" aria-label={label} checked={checked} disabled={busy} onChange={e=>set(e.target.checked)} className="peer sr-only"/>
 <span aria-hidden="true" className="relative h-7 w-12 shrink-0 rounded-full bg-muted-foreground/30 transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring after:absolute after:left-1 after:top-1 after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5"/>
 </label>)}
 <button type="submit" disabled={busy} className="w-full rounded-lg bg-primary px-5 py-3 font-medium text-primary-foreground disabled:opacity-50">{busy?"Guardando...":"Guardar cambios"}</button>
 {message&&<p role="status" className={ok?"text-emerald-500":"text-destructive"}>{message}</p>}
 </form>;
}
