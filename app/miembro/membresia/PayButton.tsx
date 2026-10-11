"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createMercadoPagoPreferenceAction } from "@/app/actions";
import { CreditCard, Loader2 } from "lucide-react";

interface PayButtonProps {
  memberId?: number;
  planId?: number;
  price?: number;
  label?: string;
}

export function PayButton({
  memberId,
  planId,
  price = 0,
  label = "Pagar ahora",
}: PayButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!memberId || !planId) {
      alert("No se pudo identificar tu membresía o plan.");
      return;
    }

    try {
      setLoading(true);

      const result = await createMercadoPagoPreferenceAction(memberId, planId);

      if (!result.success) {
        alert(result.error || "No se pudo generar el pago.");
        return;
      }

      const checkoutUrl = result.init_point || result.sandbox_init_point;

      if (!checkoutUrl) {
        alert("Mercado Pago no devolvió una URL de checkout.");
        return;
      }

      window.location.href = checkoutUrl;
    } catch (error) {
      console.error("Error procesando pago:", error);
      alert("No se pudo iniciar el pago.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={loading || !memberId || !planId || price <= 0}
      size="default"
      className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg gap-2 shadow-xs cursor-pointer disabled:opacity-50"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Generando pago...
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4" />
          {label}
          {price > 0
            ? ` ($${price.toLocaleString("es-AR")})`
            : ""}
        </>
      )}
    </Button>
  );
}
