"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

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
      if (destination.protocol !== "https:" ||
          !["mercadopago.com.ar", "www.mercadopago.com.ar", "mercadopago.com", "www.mercadopago.com"].includes(destination.hostname)) {
        throw new Error("La dirección de pago no es válida");
      }
      window.location.assign(destination.toString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al iniciar el pago");
      setBusy(false);
    }
  }
  return (
    <div className="space-y-1">
      <Button type="button" size="sm" onClick={pay} disabled={busy}>
        {busy ? "Preparando pago..." : "Pagar con Mercado Pago (prueba)"}
      </Button>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
