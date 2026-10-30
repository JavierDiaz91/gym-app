"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";

export function SaaSCheckoutButton({ invoiceId }: { invoiceId: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function pay() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/saas/mercadopago/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId })
      });
      const data = await response.json();
      if (!response.ok || typeof data.checkoutUrl !== "string") {
        throw new Error(data.error || "No se pudo iniciar el pago");
      }
      // Only navigate to the official Mercado Pago checkout domain.
      const destination = new URL(data.checkoutUrl);
      if (destination.protocol !== "https:" || destination.username || destination.password ||
          !["mercadopago.com.ar", "www.mercadopago.com.ar", "mercadopago.com", "www.mercadopago.com", "sandbox.mercadopago.com.ar", "sandbox.mercadopago.com"].includes(destination.hostname)) {
        throw new Error("La dirección de pago no es válida");
      }
      window.location.assign(destination.toString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al iniciar el pago");
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button type="button" size="sm" onClick={pay} disabled={busy} className="min-w-[156px] gap-2 rounded-xl px-4 font-semibold shadow-sm">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CreditCard className="h-4 w-4" aria-hidden="true" />}
        {busy ? "Preparando..." : "Pagar ahora"}
      </Button>
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Mercado Pago · Prueba
      </span>
      {error && <p role="alert" className="max-w-[240px] text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}
