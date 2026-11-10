"use client";

import { useState } from "react";
import { requestMembershipPlan } from "./actions";

export function RequestPlanButton({ planId }: { planId: number }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const result = await requestMembershipPlan(planId);
      setMessage(result.message);
      setDone(result.success);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={submit} disabled={busy || done}
        className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {busy ? "Enviando..." : done ? "Solicitud enviada" : "Solicitar este plan"}
      </button>
      {message && <p role="status" className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
