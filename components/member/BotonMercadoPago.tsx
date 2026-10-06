"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";

interface Props {
  tenantId?: string;
  memberId?: number;
  planId?: number;
  planName?: string;
  price?: number;
  payerEmail?: string; // Opcional: Para pasar el e-mail del comprador de prueba
  className?: string;
}

export default function BotonMercadoPago({
  tenantId = "gym-test-01",
  memberId = 1,
  planName = "Cuota Gimnasio - Pase Libre",
  price = 20000,
  payerEmail,
  className,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handlePagar = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:3001/api/mercadopago/create-preference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantId,
          memberId,
          price,
          planName,
          payerEmail,
        }),
      });

      const data = await res.json();

      // En entorno de desarrollo priorizamos estrictamente sandbox_init_point
      const checkoutUrl = data.sandbox_init_point || data.init_point;

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        console.error("Error al obtener la preferencia de pago:", data);
      }
    } catch (error) {
      console.error("Error al conectar con el servidor Express:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePagar}
      disabled={loading}
      size="lg"
      className={className || "w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md gap-2"}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <CreditCard className="w-5 h-5" />
      )}
      Pagar Cuota con Mercado Pago
    </Button>
  );
}