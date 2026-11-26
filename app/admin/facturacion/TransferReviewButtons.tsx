"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewSaaSTransferAction } from "@/app/actions";

export default function TransferReviewButtons({ id, canApprove }: { id: string; canApprove: boolean }) {
  const router = useRouter();
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  async function submit() {
    if (!decision || busy || done || (decision === "approved" && !canApprove) || (decision === "rejected" && !notes.trim())) return;
    setBusy(true); setMessage("");
    try {
      const result = await reviewSaaSTransferAction(id, decision, notes);
      if (!result.success) { setMessage(result.error || "No se pudo revisar."); return; }
      setDone(true); setMessage(decision === "approved" ? "Pago aprobado correctamente." : "Transferencia rechazada correctamente.");
      setDecision(null); router.refresh();
    } catch { setMessage("No se pudo completar la operación."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3 pt-2">
    {!done && <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy || !canApprove} onClick={() => {setDecision("approved");setNotes("");setMessage("");}} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Aprobar pago</button>
      <button type="button" disabled={busy} onClick={() => {setDecision("rejected");setNotes("");setMessage("");}} className="rounded-lg border border-destructive px-4 py-2 text-sm font-medium text-destructive disabled:opacity-50">Rechazar transferencia</button>
    </div>}
    {decision && !done && <div className="space-y-2 rounded-lg border border-border p-3">
      <p className="text-sm font-medium">{decision === "approved" ? "Confirmá que verificaste la acreditación bancaria. La factura quedará pagada." : "Indicá el motivo del rechazo."}</p>
      <textarea aria-label="Observaciones de revisión" value={notes} onChange={e => setNotes(e.target.value)} maxLength={1000} disabled={busy} placeholder={decision === "rejected" ? "Motivo obligatorio" : "Observaciones opcionales"} className="w-full rounded-md border border-border bg-background p-2 text-sm" />
      <div className="flex gap-2">
        <button type="button" disabled={busy || (decision === "rejected" && !notes.trim())} onClick={submit} className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50">{busy ? "Procesando..." : "Confirmar"}</button>
        <button type="button" disabled={busy} onClick={() => setDecision(null)} className="rounded-md border border-border px-3 py-2 text-sm">Cancelar</button>
      </div>
    </div>}
    {message && <p role="status" className={done ? "text-sm text-green-600" : "text-sm text-destructive"}>{message}</p>}
  </div>;
}
