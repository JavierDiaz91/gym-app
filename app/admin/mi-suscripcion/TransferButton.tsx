"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
export function TransferButton({invoiceId,amount}:{invoiceId:number;amount:string}) {
 const router=useRouter();
 const dialog=useRef<HTMLDialogElement>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 return <>
 <button type="button" className="rounded-full border border-primary px-4 py-2 text-sm font-medium text-primary" onClick={()=>{setError("");dialog.current?.showModal();}}>Informar transferencia</button>
 <dialog ref={dialog} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-card p-5 text-card-foreground backdrop:bg-black/60" onCancel={e=>{if(busy)e.preventDefault();}}>
 <form className="space-y-4 text-left" onSubmit={async e=>{
 e.preventDefault(); if(busy)return;
 const form=e.currentTarget; const data=new FormData(form); const file=data.get("receipt");
 if(!(file instanceof File)||file.size<1||file.size>2097152){setError("Seleccioná un archivo de hasta 2 MiB.");return;}
 data.set("invoiceId",String(invoiceId));setBusy(true);setError("");
 try {const response=await fetch("/api/saas/transfers",{method:"POST",body:data});const result=await response.json();if(!response.ok||!result.success)throw new Error(result.error||"No se pudo enviar el comprobante.");form.reset();dialog.current?.close();router.refresh();}
 catch(e){setError(e instanceof Error?e.message:"No se pudo enviar el comprobante.");}finally{setBusy(false);}
 }}>
 <h2 className="text-xl font-semibold">Informar transferencia</h2>
 <p>KIV-{String(invoiceId).padStart(6,"0")} · {amount}</p>
 <label className="block text-sm">Número de operación<input name="operation" required minLength={4} maxLength={120} className="mt-1 w-full rounded-lg border bg-background p-2"/></label>
 <label className="block text-sm">Comprobante<input name="receipt" type="file" accept="application/pdf,image/png,image/jpeg" required className="mt-1 block w-full text-sm"/></label>
 <p className="text-xs text-muted-foreground">PDF, PNG o JPG · Máximo 2 MiB. El pago quedará en revisión hasta su aprobación.</p>
 {error&&<p role="alert" className="text-sm text-red-500">{error}</p>}
 <div className="flex flex-wrap justify-end gap-2"><button type="button" disabled={busy} onClick={()=>dialog.current?.close()} className="rounded-lg border px-3 py-2">Cancelar</button><button disabled={busy} className="rounded-lg bg-primary px-3 py-2 text-primary-foreground">{busy?"Enviando…":"Enviar comprobante"}</button></div>
 </form></dialog></>;
}
