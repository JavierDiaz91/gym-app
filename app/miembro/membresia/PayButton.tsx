"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";

interface PayButtonProps {
  memberId?: number;
  planId?: number;
  planName?: string;
  price?: number;
}

export function PayButton({ 
  memberId, 
  planId, 
  planName = "Pase Libre", 
  price = 50000 // Fallback visual si price viene undefined
}: PayButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!memberId) {
      alert("Error: No se identificó el ID del socio.");
      return;
    }

    try {
      setLoading(true);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

      const response = await fetch(`${apiUrl}/api/payments/create-preference`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberId,
          planId,
          planName,
          price,
        }),
      });

      const data = await response.json();

      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        alert(data.error || "Error al generar la preferencia de pago.");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error procesando pago:", error);
      alert("No se pudo conectar con el servidor de pagos.");
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={loading || !memberId}
      size="default"
      className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg gap-2 shadow-xs cursor-pointer disabled:opacity-50"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Procesando...
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4" />
          Pagar Cuota (${price > 0 ? price.toLocaleString("es-AR") : "50.000"})
        </>
      )}
    </Button>
  );
}