"use client";

import { useMemo, useState } from "react";
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
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  MessageCircle,
  PlusCircle,
  QrCode,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

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
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [copied, setCopied] = useState(false);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === Number(selectedPlanId)),
    [plans, selectedPlanId]
  );

  const selectedMember = useMemo(
    () => members.find((m) => m.id === Number(selectedMemberId)),
    [members, selectedMemberId]
  );

  const resetGeneratedPayment = () => {
    setPaymentLink("");
    setCopied(false);
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) {
      resetGeneratedPayment();
      setLoading(false);
    }
  };

  const handleMemberChange = (memberId: string) => {
    setSelectedMemberId(memberId);
    resetGeneratedPayment();
  };

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    resetGeneratedPayment();
  };

  const handleMethodChange = (method: string) => {
    setPaymentMethod(method);
    resetGeneratedPayment();
  };

  const handleCopyLink = async () => {
    if (!paymentLink) return;

    try {
      await navigator.clipboard.writeText(paymentLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("No se pudo copiar el enlace automáticamente.");
    }
  };

  const handleWhatsApp = () => {
    if (!paymentLink) return;

    const memberName = selectedMember
      ? `${selectedMember.first_name} ${selectedMember.last_name}`
      : "socio";
    const planName = selectedPlan?.name || "membresía";
    const amount = Number(selectedPlan?.price || 0).toLocaleString("es-AR");

    const message =
      `Hola ${memberName}. Te compartimos el link para abonar ${planName}` +
      (amount ? ` por $${amount}` : "") +
      `: ${paymentLink}`;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    if (paymentMethod === "mercadopago") {
      try {
        const memberId = Number(formData.get("memberId"));
        const planId = Number(formData.get("planId"));

        const data = await createMercadoPagoPreferenceAction(memberId, planId);

        if (data.success) {
          const checkoutUrl = data.init_point || data.sandbox_init_point;

          if (!checkoutUrl) {
            alert("Mercado Pago no devolvió un enlace de pago.");
            return;
          }

          setPaymentLink(checkoutUrl);
        } else {
          alert(
            "Error de Mercado Pago: " +
              (data.error || "No se pudo generar el enlace")
          );
        }
      } catch (err) {
        console.error("Error conectando con la API de pagos:", err);
        alert("Error al conectar con el servidor de pagos");
      } finally {
        setLoading(false);
      }
      return;
    }

    const res = await createPayment(formData);
    setLoading(false);

    if (res.success) {
      setOpen(false);
    } else {
      alert("Error al registrar pago: " + res.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <PlusCircle className="w-4 h-4" /> Registrar Cobro
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Registrar Nuevo Pago</DialogTitle>
        </DialogHeader>

        {!paymentLink ? (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="memberId">Socio</Label>
              <Select
                name="memberId"
                value={selectedMemberId}
                onValueChange={handleMemberChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Buscar o seleccionar socio" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id.toString()}>
                      {m.last_name}, {m.first_name}{" "}
                      {m.dni ? `(DNI: ${m.dni})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="planId">Plan a Cobrar</Label>
              <Select
                name="planId"
                value={selectedPlanId}
                onValueChange={handlePlanChange}
                required
              >
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

            <div className="space-y-2">
              <Label htmlFor="amount">Monto ($)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                value={selectedPlan?.price ?? ""}
                placeholder="0.00"
                readOnly
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Método de Pago</Label>
              <Select
                name="paymentMethod"
                value={paymentMethod}
                onValueChange={handleMethodChange}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="mercadopago">
                    Mercado Pago (Cobro Online)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMethod !== "mercadopago" && (
              <div className="space-y-2">
                <Label htmlFor="transactionId">
                  N° Comprobante / Transacción (Opcional)
                </Label>
                <Input
                  id="transactionId"
                  name="transactionId"
                  placeholder="Ej: TR-984123"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notas o Observaciones</Label>
              <Input
                id="notes"
                name="notes"
                placeholder="Ej: Pago parcial / Descuento aplicado"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {paymentMethod === "mercadopago"
                ? "Generar Cobro Mercado Pago"
                : "Confirmar Cobro"}
            </Button>
          </form>
        ) : (
          <div className="space-y-5 pt-2">
            <div className="rounded-xl border bg-muted/30 p-4 space-y-1">
              <p className="font-semibold">Cobro generado correctamente</p>
              <p className="text-sm text-muted-foreground">
                {selectedMember
                  ? `${selectedMember.first_name} ${selectedMember.last_name}`
                  : "Socio"}{" "}
                · {selectedPlan?.name || "Plan"} · $
                {Number(selectedPlan?.price || 0).toLocaleString("es-AR")}
              </p>
            </div>

            <div className="flex justify-center rounded-xl border bg-white p-5">
              <QRCodeSVG
                value={paymentLink}
                size={220}
                level="M"
                includeMargin
                aria-label="Código QR del link de pago"
              />
            </div>

            <p className="text-center text-sm text-muted-foreground">
              El socio puede escanear este QR desde su celular para abrir el
              checkout de Mercado Pago.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyLink}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" /> Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copiar link
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleWhatsApp}
                className="gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Enviar por WhatsApp
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  window.open(paymentLink, "_blank", "noopener,noreferrer")
                }
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir checkout
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={resetGeneratedPayment}
                className="gap-2"
              >
                <QrCode className="w-4 h-4" />
                Generar otro cobro
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
