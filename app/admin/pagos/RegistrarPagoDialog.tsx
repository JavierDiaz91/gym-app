"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createMercadoPagoPreferenceAction, createPayment } from "@/app/actions";
import { PlusCircle, Loader2 } from "lucide-react";

interface Member {
  id: number;
  first_name: string;
  last_name: string;
  dni: string;
}

interface Plan {
  id: number;
  name: string;
  price: number;
}

interface Props {
  members: Member[];
  plans: Plan[];
}

export function RegistrarPagoDialog({ members, plans }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedPlanPrice, setSelectedPlanPrice] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("efectivo");

  const handlePlanChange = (planIdStr: string) => {
    const plan = plans.find((p) => p.id === Number(planIdStr));
    if (plan) {
      setSelectedPlanPrice(plan.price.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    // --- FLUJO MERCADO PAGO ---
    if (paymentMethod === "mercadopago") {
      try {
        const memberId = Number(formData.get("memberId"));
        const planId = Number(formData.get("planId"));

        const data = await createMercadoPagoPreferenceAction(memberId, planId);
        setLoading(false);

        if (data.success && data.init_point) {
          setOpen(false);
          window.open(data.init_point, "_blank");
        } else {
          alert(
            "Error de Mercado Pago: " +
              (data.error || "No se pudo generar el enlace")
          );
        }
      } catch (err) {
        setLoading(false);
        console.error("Error conectando con la API de pagos:", err);
        alert("Error al conectar con el servidor de pagos");
      }
      return;
    }

    // --- FLUJO MANUAL (Efectivo / Transferencia / Tarjeta) ---
    const res = await createPayment(formData);
    setLoading(false);

    if (res.success) {
      setOpen(false);
    } else {
      alert("Error al registrar pago: " + res.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <PlusCircle className="w-4 h-4" /> Registrar Cobro
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Nuevo Pago</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Seleccionar Socio */}
          <div className="space-y-2">
            <Label htmlFor="memberId">Socio</Label>
            <Select name="memberId" required>
              <SelectTrigger>
                <SelectValue placeholder="Buscar o seleccionar socio" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id.toString()}>
                    {m.last_name}, {m.first_name} {m.dni ? `(DNI: ${m.dni})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seleccionar Plan */}
          <div className="space-y-2">
            <Label htmlFor="planId">Plan a Cobrar</Label>
            <Select name="planId" onValueChange={handlePlanChange} required>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.name} - ${Number(p.price).toLocaleString("es-AR")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Monto */}
          <div className="space-y-2">
            <Label htmlFor="amount">Monto ($)</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              defaultValue={selectedPlanPrice}
              key={selectedPlanPrice}
              placeholder="0.00"
              readOnly
              required
            />
          </div>

          {/* Método de Pago */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Método de Pago</Label>
            <Select 
              name="paymentMethod" 
              value={paymentMethod} 
              onValueChange={setPaymentMethod} 
              required
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="tarjeta">Tarjeta</SelectItem>
                <SelectItem value="mercadopago">Mercado Pago (Cobro Online)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* N° Transacción / Referencia */}
          {paymentMethod !== "mercadopago" && (
            <div className="space-y-2">
              <Label htmlFor="transactionId">N° Comprobante / Transacción (Opcional)</Label>
              <Input id="transactionId" name="transactionId" placeholder="Ej: TR-984123" />
            </div>
          )}

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas o Observaciones</Label>
            <Input id="notes" name="notes" placeholder="Ej: Pago parcial / Descuento aplicado" />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {paymentMethod === "mercadopago" ? "Generar Link de Pago MP" : "Confirmar Cobro"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}