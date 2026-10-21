"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import {
  generateSaaSInvoiceAction,
  createSaaSTestInvoiceAction,
  markSaaSInvoicePaidAction,
} from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SubscriptionRow = {
  id: number;
  gym_id: number;
  gym_name: string;
  gym_slug: string;
  plan_id: number;
  plan_name: string;
  effective_price: number | string | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  next_billing_date: string | null;
};

type InvoiceRow = {
  id: number;
  gym_id: number;
  gym_name: string;
  subscription_id: number | null;
  plan_name: string | null;
  period_start: string | null;
  period_end: string | null;
  amount: number | string;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
};

function formatMoney(value: number | string | null | undefined) {
  if (value == null) return "Sin definir";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Sin definir";
  return "$" + amount.toLocaleString("es-AR");
}

function formatDate(value: string | Date | null | undefined) {
  if (value == null || value === "") return "-";
  // Neon/Next may serialize SQL DATE and TIMESTAMP values as Date objects
  // rather than strings. Normalize before using string methods.
  const text = value instanceof Date
    ? (Number.isNaN(value.getTime()) ? "" : value.toISOString())
    : typeof value === "string" ? value : "";
  if (!text) return "-";
  // Preserve the calendar date to avoid UTC -> Argentina day shifts.
  const datePart = text.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleDateString("es-AR", { timeZone: "UTC" });
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") {
    return <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-500">Pagada</Badge>;
  }
  if (status === "overdue") {
    return <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-500">Vencida</Badge>;
  }
  if (status === "cancelled") {
    return <Badge className="border-zinc-500/20 bg-zinc-500/10 text-zinc-400">Cancelada</Badge>;
  }
  return <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-500">Pendiente</Badge>;
}

export default function SaaSBillingClient({
  initialSubscriptions,
  initialInvoices,
}: {
  initialSubscriptions: SubscriptionRow[];
  initialInvoices: InvoiceRow[];
}) {
  const router = useRouter();
  const [subscriptions] = useState<SubscriptionRow[]>(
    Array.isArray(initialSubscriptions) ? initialSubscriptions : []
  );
  const [invoices, setInvoices] = useState<InvoiceRow[]>(
    Array.isArray(initialInvoices) ? initialInvoices : []
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [testSubscriptionId, setTestSubscriptionId] = useState(String(initialSubscriptions[0]?.id ?? ""));
  const [testAmount, setTestAmount] = useState("1750");
  const [testDueDate, setTestDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [showTestForm, setShowTestForm] = useState(false);
  const [billingMonth, setBillingMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const totalPending = useMemo(
    () =>
      invoices
        .filter((invoice) => invoice.status === "pending" || invoice.status === "overdue")
        .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0),
    [invoices]
  );

  const totalPaid = useMemo(
    () =>
      invoices
        .filter((invoice) => invoice.status === "paid")
        .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0),
    [invoices]
  );

  async function generateInvoice(subscriptionId: number) {
    const key = "subscription-" + subscriptionId;
    setBusyId(key);

    const result = await generateSaaSInvoiceAction(subscriptionId, billingMonth);

    setBusyId(null);

    if (!result.success) {
      toast.error(result.error || "No se pudo generar la factura.");
      return;
    }

    toast.success(result.alreadyExists ? `La factura #${result.invoiceId} ya existe; no se duplicó.` : `Factura #${result.invoiceId} generada correctamente.`);
    router.refresh();
  }

  async function createTestInvoice() {
    const amount = Number(testAmount);
    if (!testSubscriptionId || !Number.isFinite(amount) || amount < 1 || amount > 10000 || !testDueDate) {
      toast.error("Completá gimnasio, importe de 1 a 10.000 y vencimiento.");
      return;
    }
    if (!window.confirm(`¿Crear factura de PRUEBA por ${amount.toLocaleString("es-AR")} sin modificar las cuotas mensuales?`)) return;
    setBusyId("test-invoice");
    const result = await createSaaSTestInvoiceAction(Number(testSubscriptionId), amount, testDueDate);
    setBusyId(null);
    if (!result.success) {
      toast.error(result.error || "No se pudo crear la factura de prueba.");
      return;
    }
    toast.success(`Factura de prueba #${result.invoiceId} creada.`);
    setShowTestForm(false);
    router.refresh();
  }

  async function markPaid(invoiceId: number) {
    const key = "invoice-" + invoiceId;
    setBusyId(key);

    if (!window.confirm(`¿Confirmás que verificaste el ingreso real de la factura #${invoiceId} antes de marcarla como pagada?`)) return;
    const result = await markSaaSInvoicePaidAction(invoiceId);

    setBusyId(null);

    if (!result.success) {
      toast.error(result.error || "No se pudo actualizar la factura.");
      return;
    }

    setInvoices((current) =>
      current.map((invoice) =>
        invoice.id === invoiceId
          ? { ...invoice, status: "paid", paid_at: new Date().toISOString() }
          : invoice
      )
    );

    toast.success("Factura marcada como pagada.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Suscripciones SaaS</p>
            <p className="mt-3 text-3xl font-bold">{subscriptions.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Pendiente de cobro</p>
            <p className="mt-3 text-3xl font-bold">{formatMoney(totalPending)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Cobrado</p>
            <p className="mt-3 text-3xl font-bold">{formatMoney(totalPaid)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generación de facturas por mes calendario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label htmlFor="billing-month" className="block text-sm font-medium">Mes a facturar</label>
          <input id="billing-month" type="month" value={billingMonth} max={new Date().toISOString().slice(0, 7)}
            onChange={(event) => setBillingMonth(event.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <p className="text-xs text-muted-foreground">Seleccioná el mes y presioná Generar factura en el gimnasio correspondiente. El primer mes se prorratea desde el alta y no se duplican facturas existentes. Los meses futuros no están habilitados en el piloto.</p>
        </CardContent>
      </Card>

      {process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" && (
        <Card className="border-blue-500/30">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Facturas de prueba</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Solo Preview. No modifica el plan ni genera un período mensual.</p>
              </div>
              <Button variant="outline" onClick={() => setShowTestForm(!showTestForm)}>
                {showTestForm ? "Cerrar" : "Crear factura de prueba"}
              </Button>
            </div>
          </CardHeader>
          {showTestForm && (
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <label className="text-sm font-medium">Gimnasio
                <select className="mt-2 w-full rounded-md border border-input bg-background p-2" value={testSubscriptionId} onChange={e => setTestSubscriptionId(e.target.value)}>
                  {subscriptions.map(s => <option key={s.id} value={s.id}>{s.gym_name} (ID {s.gym_id})</option>)}
                </select>
              </label>
              <label className="text-sm font-medium">Importe (ARS)
                <input type="number" min="1" max="10000" step="0.01" className="mt-2 w-full rounded-md border border-input bg-background p-2" value={testAmount} onChange={e => setTestAmount(e.target.value)} />
              </label>
              <label className="text-sm font-medium">Vencimiento
                <input type="date" className="mt-2 w-full rounded-md border border-input bg-background p-2" value={testDueDate} onChange={e => setTestDueDate(e.target.value)} />
              </label>
              <div className="sm:col-span-3 flex items-center justify-end">
                <Button onClick={createTestInvoice} disabled={busyId === "test-invoice" || !testSubscriptionId}>
                  {busyId === "test-invoice" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar factura de prueba
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Suscripciones de gimnasios</CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Todavía no hay gimnasios con un plan SaaS asignado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="pb-3">Gimnasio</th>
                    <th className="pb-3">Plan</th>
                    <th className="pb-3">Precio</th>
                    <th className="pb-3">Próximo vencimiento</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {subscriptions.map((subscription) => (
                    <tr key={subscription.id}>
                      <td className="py-4">
                        <p className="font-medium">{subscription.gym_name}</p>
                        <p className="text-xs text-muted-foreground">{subscription.gym_slug}</p>
                      </td>
                      <td className="py-4">{subscription.plan_name}</td>
                      <td className="py-4">{formatMoney(subscription.effective_price)}</td>
                      <td className="py-4">{formatDate(subscription.next_billing_date)}</td>
                      <td className="py-4 capitalize">{subscription.status}</td>
                      <td className="py-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateInvoice(subscription.id)}
                          disabled={busyId === "subscription-" + subscription.id}
                        >
                          {busyId === "subscription-" + subscription.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Receipt className="mr-2 h-4 w-4" />
                          )}
                          Generar factura del mes
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Facturas SaaS</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Todavía no hay facturas SaaS generadas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="pb-3">Factura</th>
                    <th className="pb-3">Gimnasio</th>
                    <th className="pb-3">Plan</th>
                    <th className="pb-3">Período</th>
                    <th className="pb-3">Importe</th>
                    <th className="pb-3">Vencimiento</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="py-4 font-medium">#{invoice.id}</td>
                      <td className="py-4">{invoice.gym_name}</td>
                      <td className="py-4">{invoice.plan_name || "-"}</td>
                      <td className="py-4">
                        {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                      </td>
                      <td className="py-4 font-semibold">{formatMoney(invoice.amount)}</td>
                      <td className="py-4">{formatDate(invoice.due_date)}</td>
                      <td className="py-4">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="py-4 text-right">
                        {(invoice.status === "pending" || invoice.status === "overdue") && (
                          <Button
                            size="sm"
                            onClick={() => markPaid(invoice.id)}
                            disabled={busyId === "invoice-" + invoice.id}
                          >
                            {busyId === "invoice-" + invoice.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                            )}
                            Marcar pagada
                          </Button>
                        )}
                        {invoice.status === "paid" && (
                          <span className="text-xs text-muted-foreground">
                            {invoice.paid_at ? "Pagada " + formatDate(invoice.paid_at) : "Pagada"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
