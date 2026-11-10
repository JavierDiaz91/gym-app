"use client";

import { useState } from "react";
import { resolvePlanRequest } from "./actions";

export function RequestDecisionButtons({ id }: { id: number }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  async function act(decision: "approved" | "rejected") {
    if (decision === "rejected" && !window.confirm("¿Rechazar esta solicitud?")) return;
    setBusy(true);
    try {
      const result = await resolvePlanRequest(id, decision);
      setMessage(result.message);
      setDone(result.success);
    } catch {
      setMessage("No se pudo procesar la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy || done} onClick={() => act("approved")}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {busy ? "Procesando..." : "Confirmar plan pagado"}
        </button>
        <button type="button" disabled={busy || done} onClick={() => act("rejected")}
          className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">
          Rechazar
        </button>
      </div>
      {message && <p role="status" className="max-w-sm text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
