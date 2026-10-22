"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createFlexibleInPersonPayment } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Ticket } from "lucide-react";

interface Member { id: number; first_name: string; last_name: string; dni: string }
interface Plan { id: number; name: string; price: number; access_mode: string; duration_days: number | null; max_entries: number | null }

export function RegistrarPaseFlexibleDialog({ members, plans }: { members: Member[]; plans: Plan[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [planId, setPlanId] = useState("");
  const [method, setMethod] = useState("cash");
  const [transactionId, setTransactionId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ paymentId: string; subscriptionId: string } | null>(null);
  const plan = plans.find(p => p.id === Number(planId));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading || result) return;
    setError("");
    if (!memberId || !planId || !transactionId.trim() || !plan) {
      setError("Seleccioná socio y pack, e ingresá una referencia única.");
      return;
    }
    if (!window.confirm(`¿Confirmás el cobro recibido de $${Number(plan.price).toLocaleString("es-AR")} por ${plan.name}?`)) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.set("memberId", memberId);
      form.set("planId", planId);
      form.set("paymentMethod", method);
      form.set("transactionId", transactionId.trim());
      form.set("notes", notes.trim());
      const response = await createFlexibleInPersonPayment(form);
      if (response.success && response.paymentId && response.subscriptionId) {
        setResult({ paymentId: response.paymentId, subscriptionId: response.subscriptionId });
        router.refresh();
      } else {
        setError(response.error || "No se pudo registrar el cobro.");
      }
    } catch {
      setError("No se pudo confirmar el cobro. Revisá el historial antes de reintentar con otra referencia.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={value => {
      if (loading) return;
      setOpen(value);
      if (!value) { setError(""); setResult(null); setTransactionId(""); setNotes(""); }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2"><Ticket className="h-4 w-4" /> Cobrar pase o pack</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader><DialogTitle>Cobro presencial de pase flexible</DialogTitle></DialogHeader>
        {result ? (
          <div className="space-y-3">
            <p className="font-medium">Cobro registrado correctamente.</p>
            <p className="text-sm">Pago #{result.paymentId} · Suscripción #{result.subscriptionId}</p>
            <Button onClick={() => setOpen(false)}>Cerrar</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Socio</Label>
              <Select value={memberId} onValueChange={setMemberId} required>
                <SelectTrigger><SelectValue placeholder="Seleccionar socio" /></SelectTrigger>
                <SelectContent>{members.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.last_name}, {m.first_name} {m.dni ? `(DNI ${m.dni})` : ""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pase o pack</Label>
              <Select value={planId} onValueChange={setPlanId} required>
                <SelectTrigger><SelectValue placeholder="Seleccionar pase" /></SelectTrigger>
                <SelectContent>{plans.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name} — $${p.price.toLocaleString("es-AR")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {plan && <p className="text-sm text-muted-foreground">Vigencia: {plan.duration_days} día(s){plan.access_mode === "entry_pack" ? ` · ${plan.max_entries} ingresos` : ""}. Precio fijo: $${plan.price.toLocaleString("es-AR")}.</p>}
            <div className="space-y-2">
              <Label>Método (pago ya recibido)</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="cash">Efectivo</SelectItem><SelectItem value="transfer">Transferencia confirmada</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="flexibleTransactionId">Referencia única del pago</Label>
              <Input id="flexibleTransactionId" value={transactionId} onChange={e => setTransactionId(e.target.value)} maxLength={120} required placeholder="Ej.: CAJA-20261022-001" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flexibleNotes">Observaciones (opcional)</Label>
              <Input id="flexibleNotes" value={notes} onChange={e => setNotes(e.target.value)} maxLength={1000} />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading || !plans.length} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar cobro recibido
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
