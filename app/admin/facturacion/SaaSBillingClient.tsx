"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import {
  generateSaaSInvoiceAction,
  createSaaSTestInvoiceAction,
  createSaaSManualInvoiceAction,
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

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return date.toLocaleDateString("es-AR", { timeZone: "UTC" });
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
  transferSection,
}: {
  initialSubscriptions: SubscriptionRow[];
  initialInvoices: InvoiceRow[];
  transferSection?: React.ReactNode;
}) {
  const router = useRouter();
  const subscriptions = initialSubscriptions;
  const [invoices, setInvoices] = useState<InvoiceRow[]>(
    Array.isArray(initialInvoices) ? initialInvoices : []
  );
  useEffect(() => { setInvoices(initialInvoices); }, [initialInvoices]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [testSubscriptionId, setTestSubscriptionId] = useState(String(initialSubscriptions[0]?.id ?? ""));
  const [testAmount, setTestAmount] = useState("1750");
  const [testDueDate, setTestDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formMode, setFormMode] = useState<"manual" | "test" | null>(null);
  const [subscriptionQuery, setSubscriptionQuery] = useState("");
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState("all");
  const [invoicePage, setInvoicePage] = useState(0);
  const filteredSubscriptions = subscriptions.filter(s => `${s.gym_name} ${s.gym_slug} ${s.plan_name}`.toLowerCase().includes(subscriptionQuery.trim().toLowerCase()));
  const filteredInvoices = invoices.filter(i => (invoiceStatus === "all" || i.status === invoiceStatus) && `${i.id} ${i.gym_name} ${i.plan_name ?? ""}`.toLowerCase().includes(invoiceQuery.trim().toLowerCase()));
  const page = Math.min(invoicePage, Math.max(0, Math.ceil(filteredInvoices.length / 10) - 1));

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

    const result = await generateSaaSInvoiceAction(subscriptionId);

    setBusyId(null);

    if (!result.success) {
      toast.error(result.error || "No se pudo generar la factura.");
      return;
    }

    toast.success("Factura SaaS generada.");
    router.refresh();
  }

  async function createTestInvoice() {
    const amount = Number(testAmount);
    if (!testSubscriptionId || !Number.isFinite(amount) || amount < 1 || amount > 10000 || !testDueDate) {
      toast.error("Completá gimnasio, importe de 1 a 10.000 y vencimiento.");
      return;
    }
    if (!window.confirm("¿Crear factura de PRUEBA sin modificar las cuotas mensuales?")) return;
    setBusyId("test-invoice");
    try {
      const result = await createSaaSTestInvoiceAction(Number(testSubscriptionId), amount, testDueDate);
      if (!result.success) { toast.error(result.error || "No se pudo crear la factura."); return; }
      toast.success("Factura de prueba #" + result.invoiceId + " creada.");
      setFormMode(null);
      router.refresh();
    } finally { setBusyId(null); }
  }

  async function createManualInvoice() {
    const amount = Number(testAmount);
    if (!testSubscriptionId || !Number.isFinite(amount) || amount < 1 || amount > 100000000 || !testDueDate) {
      toast.error("Completá gimnasio, importe y vencimiento.");
      return;
    }
    if (!window.confirm("¿Generar una factura manual por $" + amount.toLocaleString("es-AR") + "? Se registrará como pendiente de cobro.")) return;
    setBusyId("manual-invoice");
    try {
      const result = await createSaaSManualInvoiceAction(Number(testSubscriptionId), amount, testDueDate);
      if (!result.success) { toast.error(result.error || "No se pudo generar la factura."); return; }
      toast.success("Factura manual #" + result.invoiceId + " creada.");
      setFormMode(null);
      router.refresh();
    } finally { setBusyId(null); }
  }

  async function markPaid(invoiceId: number) {
    const key = "invoice-" + invoiceId;
    setBusyId(key);

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
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm text-muted-foreground">Suscripciones SaaS</p>
            <p className="mt-3 break-words text-2xl sm:text-3xl font-bold">{subscriptions.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm text-muted-foreground">Pendiente de cobro</p>
            <p className="mt-3 break-words text-2xl sm:text-3xl font-bold">{formatMoney(totalPending)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm text-muted-foreground">Cobrado</p>
            <p className="mt-3 break-words text-2xl sm:text-3xl font-bold">{formatMoney(totalPaid)}</p>
          </CardContent>
        </Card>
      </div>

      {transferSection}

      <Card>
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-semibold">Acciones de facturación</h2><p className="text-sm text-muted-foreground">Generá comprobantes sin modificar el período contratado.</p></div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busyId !== null} onClick={() => setFormMode(formMode === "manual" ? null : "manual")}><Receipt className="mr-2 size-4"/>Nueva factura manual</Button>
              {process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" && <Button variant="outline" disabled={busyId !== null} onClick={() => setFormMode(formMode === "test" ? null : "test")}>Factura de prueba</Button>}
            </div>
          </div>
          {formMode && <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold">{formMode === "manual" ? "Factura manual" : "Factura de prueba · Preview"}</p><Button size="sm" variant="ghost" disabled={busyId !== null} onClick={() => setFormMode(null)}>Cerrar</Button></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="min-w-0 space-y-1 text-sm">Gimnasio<select className="block w-full rounded-md border border-input bg-background p-2" value={testSubscriptionId} onChange={e=>setTestSubscriptionId(e.target.value)}>{subscriptions.map(s=><option key={s.id} value={s.id}>{s.gym_name}</option>)}</select></label>
              <label className="min-w-0 space-y-1 text-sm">Importe (ARS)<input type="number" min="1" max={formMode === "test" ? 10000 : 100000000} step="0.01" className="block w-full rounded-md border border-input bg-background p-2" value={testAmount} onChange={e=>setTestAmount(e.target.value)}/></label>
              <label className="min-w-0 space-y-1 text-sm">Vencimiento<input type="date" className="block w-full rounded-md border border-input bg-background p-2" value={testDueDate} onChange={e=>setTestDueDate(e.target.value)}/></label>
            </div>
            <Button disabled={busyId !== null} onClick={formMode === "manual" ? createManualInvoice : createTestInvoice}>{busyId ? "Generando..." : "Generar factura"}</Button>
          </div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suscripciones de gimnasios</CardTitle><input aria-label="Buscar suscripciones" placeholder="Buscar gimnasio o plan" value={subscriptionQuery} onChange={e=>setSubscriptionQuery(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"/>
        </CardHeader>
        <CardContent>
          {filteredSubscriptions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No hay suscripciones para mostrar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
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
                  {filteredSubscriptions.map((subscription) => (
                    <tr key={subscription.id}>
                      <td className="py-3">
                        <p className="font-medium">{subscription.gym_name}</p>
                        <p className="text-xs text-muted-foreground">{subscription.gym_slug}</p>
                      </td>
                      <td className="py-3">{subscription.plan_name}</td>
                      <td className="py-3">{formatMoney(subscription.effective_price)}</td>
                      <td className="py-3">{formatDate(subscription.next_billing_date)}</td>
                      <td className="py-3"><Badge variant="outline" className={subscription.status === "active" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500" : ""}>{({active:"Activa",pending:"Pendiente",cancelled:"Cancelada",expired:"Vencida",suspended:"Suspendida",trial:"Prueba",past_due:"Vencida"} as Record<string,string>)[subscription.status] ?? subscription.status}</Badge></td>
                      <td className="py-3 text-right">
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
                          Generar factura
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
          <CardTitle>Facturas SaaS</CardTitle><div className="flex flex-col gap-2 sm:flex-row"><input aria-label="Buscar facturas" placeholder="Buscar factura, gimnasio o plan" value={invoiceQuery} onChange={e=>{setInvoiceQuery(e.target.value);setInvoicePage(0)}} className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"/><select aria-label="Estado de factura" value={invoiceStatus} onChange={e=>{setInvoiceStatus(e.target.value);setInvoicePage(0)}} className="rounded-lg border border-input bg-background px-3 py-2 text-sm"><option value="all">Todos los estados</option><option value="paid">Pagadas</option><option value="pending">Pendientes</option><option value="overdue">Vencidas</option><option value="cancelled">Canceladas</option></select></div>
        </CardHeader>
        <CardContent>
          {filteredInvoices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No hay facturas para mostrar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
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
                  {filteredInvoices.slice(page*10,page*10+10).map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="py-3 font-medium">#{invoice.id}</td>
                      <td className="py-3">{invoice.gym_name}</td>
                      <td className="py-3">{invoice.plan_name || "-"}</td>
                      <td className="py-3">
                        {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                      </td>
                      <td className="py-3 font-semibold">{formatMoney(invoice.amount)}</td>
                      <td className="py-3">{formatDate(invoice.due_date)}</td>
                      <td className="py-3">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="py-3 text-right">
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
                            {invoice.paid_at ? "Pagada " + new Date(invoice.paid_at).toLocaleDateString("es-AR", {timeZone:"America/Argentina/Buenos_Aires"}) : "Pagada"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{filteredInvoices.length} facturas</span><div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={page===0} onClick={()=>setInvoicePage(page-1)}>Anterior</Button><span>{page+1} / {Math.max(1,Math.ceil(filteredInvoices.length/10))}</span><Button size="sm" variant="outline" disabled={(page+1)*10>=filteredInvoices.length} onClick={()=>setInvoicePage(page+1)}>Siguiente</Button></div></div>
        </CardContent>
      </Card>
    </div>
  );
}
