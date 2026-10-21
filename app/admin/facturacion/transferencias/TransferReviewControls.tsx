"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { reviewSaaSTransferAction } from "./actions";

export function TransferReviewControls({ id }: { id: number }) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function review(decision: "approve" | "reject") {
    if (decision === "approve" && !window.confirm("¿Verificaste personalmente que el dinero ingresó a la cuenta de Kivra?")) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await reviewSaaSTransferAction(id, decision, notes);
      setMessage(result.success ? "Revisión guardada. Actualizá la página." : result.error ?? "Error");
    } catch {
      setMessage("No se pudo completar la revisión.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium" htmlFor={`transfer-notes-${id}`}>Observación de verificación</label>
      <textarea
        id={`transfer-notes-${id}`}
        className="w-full rounded-md border bg-background p-2 text-sm"
        maxLength={2000}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Ej.: Ingreso comprobado en movimientos de Mercado Pago"
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy || notes.trim().length < 8} onClick={() => review("approve")}>Aprobar</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => review("reject")}>Rechazar</Button>
      </div>
      {message && <p role="status" className="text-xs">{message}</p>}
    </div>
  );
}
