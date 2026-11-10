"use client";
import { useState } from "react";
import { resolvePlanRequest } from "./actions";
import { useRouter } from "next/navigation";
export function ResolveButtons({ requestId }: { requestId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function act(approve: boolean) {
    if (!approve && !window.confirm("¿Rechazar esta solicitud?")) return;
    setBusy(true);
    try {
      const result = await resolvePlanRequest(requestId, approve ? "approved" : "rejected");
      setMessage(result.message);
      if (result.success) router.refresh();
    } catch { setMessage("No se pudo procesar la solicitud."); } finally { setBusy(false); }
  }
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={busy} onClick={() => act(true)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">Aprobar y generar pago pendiente</button>
      <button type="button" disabled={busy} onClick={() => act(false)} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Rechazar</button>
    </div>
    {message && <p role="status" className="text-xs text-muted-foreground">{message}</p>}
  </div>;
}
