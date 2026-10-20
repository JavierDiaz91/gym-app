import { getSession } from "@/app/actions";
import { SaaSCheckoutButton } from "./SaaSCheckoutButton";
import { TransferSubmissionForm } from "./TransferSubmissionForm";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, CheckCircle2, Clock3, CreditCard, FileText, ShieldCheck, Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

function date(value: unknown) {
  if (!value) return "-";
  const iso = String(value).slice(0, 10);
  const parts = iso.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : iso;
}

function money(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString("es-AR", { style: "currency", currency: "ARS" }) : "Sin definir";
}

const subscriptionLabels: Record<string, string> = {
  active: "Activa", trialing: "En prueba", past_due: "Con deuda", suspended: "Suspendida", cancelled: "Cancelada"
};

const labels: Record<string, string> = {
  pending: "Pendiente", overdue: "Vencida", paid: "Pagada", cancelled: "Cancelada"
};

export default async function MiSuscripcionKivraPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin" || session.gymId == null) redirect("/admin");

  // Never accept gym_id from a query parameter or client input.
  const gymId = session.gymId;
  const [subscription] = await sql`
    SELECT s.id, s.status, to_char(s.current_period_start, 'YYYY-MM-DD') AS current_period_start,
           to_char(s.current_period_end, 'YYYY-MM-DD') AS current_period_end,
           to_char(s.next_billing_date, 'YYYY-MM-DD') AS next_billing_date, p.name AS plan_name,
           COALESCE(s.price_override, p.monthly_price) AS monthly_price
    FROM gym_saas_subscriptions s
    JOIN saas_plans p ON p.id = s.plan_id
    WHERE s.gym_id = ${gymId}
    LIMIT 1
  `;
  const invoices = await sql`
    SELECT id, to_char(period_start, 'YYYY-MM-DD') AS period_start,
           to_char(period_end, 'YYYY-MM-DD') AS period_end,
           amount, status, to_char(due_date, 'YYYY-MM-DD') AS due_date, paid_at
    FROM saas_invoices
    WHERE gym_id = ${gymId}
    ORDER BY period_start DESC NULLS LAST, id DESC
    LIMIT 24
  `;

  const submissions = await sql`
    SELECT invoice_id, status, provisional_until
    FROM public.saas_transfer_submissions
    WHERE gym_id = ${gymId}
  `;
  const submitted = new Map(submissions.map((s) => [Number(s.invoice_id), s]));
  const paidCount = invoices.filter((i) => String(i.status) === "paid").length;
  const pendingCount = invoices.filter((i) => ["pending", "overdue"].includes(String(i.status))).length;
  const status = String(subscription?.status ?? "");
  const isActive = status === "active" || status === "trialing";
  const statusBadge = (value: string) => {
    const tone = value === "paid" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : value === "overdue" ? "border-rose-500/20 bg-rose-500/10 text-rose-400" : value === "pending" ? "border-amber-500/20 bg-amber-500/10 text-amber-400" : "border-border bg-muted text-muted-foreground";
    return <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>{value === "paid" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}{labels[value] ?? value}</span>;
  };
  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-12">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary"><span className="h-2 w-2 rounded-full bg-primary" />Kivra / Facturación</div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Mi suscripción</h1>
        <p className="text-sm text-muted-foreground">Administrá tu plan, consultá tus cuotas y elegí cómo pagar.</p>
      </header>

      {subscription ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex flex-col justify-between gap-5 border-b border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 md:flex-row md:items-center md:p-8">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3"><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tu plan actual</span><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${isActive ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-amber-500/20 bg-amber-500/10 text-amber-400"}`}>{subscriptionLabels[status] ?? status}</span></div>
              <h2 className="text-3xl font-bold tracking-tight">{String(subscription.plan_name)}</h2>
              <p className="text-sm text-muted-foreground">Servicio de gestión para tu gimnasio</p>
            </div>
            <div className="rounded-xl border border-border bg-background/70 px-6 py-4 md:text-right">
              <p className="text-xs font-medium text-muted-foreground">Precio mensual</p>
              <p className="mt-1 text-3xl font-bold tabular-nums">{money(subscription.monthly_price)}</p>
              <p className="mt-1 text-xs text-muted-foreground">ARS / mes</p>
            </div>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-2 md:p-8">
            <div className="flex items-start gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><CalendarDays className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">Período de servicio</p><p className="mt-1 text-sm font-semibold">{date(subscription.current_period_start)} al {date(subscription.current_period_end)}</p></div></div>
            <div className="flex items-start gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><Clock3 className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">Próximo vencimiento</p><p className="mt-1 text-sm font-semibold">{date(subscription.next_billing_date)}</p></div></div>
          </div>
        </div>
      ) : <Card><CardContent className="p-6">Tu gimnasio todavía no tiene un plan SaaS asignado. Contactá a Kivra.</CardContent></Card>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5"><div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400"><CheckCircle2 className="h-6 w-6" /></div><div><p className="text-sm text-muted-foreground">Cuotas pagadas</p><p className="text-2xl font-bold tabular-nums">{paidCount}</p></div></div>
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5"><div className="rounded-xl bg-amber-500/10 p-3 text-amber-400"><FileText className="h-6 w-6" /></div><div><p className="text-sm text-muted-foreground">Cuotas pendientes</p><p className="text-2xl font-bold tabular-nums">{pendingCount}</p></div></div>
      </div>

      {process.env.KIVRA_TRANSFER_ALIAS && process.env.KIVRA_TRANSFER_HOLDER && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /><h2 className="font-semibold">Datos para transferencia</h2></div>
          <div className="grid gap-3 text-sm sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Titular</p><p className="font-medium">{process.env.KIVRA_TRANSFER_HOLDER}</p></div><div><p className="text-xs text-muted-foreground">Alias</p><p className="break-all font-medium">{process.env.KIVRA_TRANSFER_ALIAS}</p></div>{process.env.KIVRA_TRANSFER_CVU && <div><p className="text-xs text-muted-foreground">CVU</p><p className="break-all font-medium">{process.env.KIVRA_TRANSFER_CVU}</p></div>}</div>
          <p className="mt-3 text-xs text-muted-foreground">Luego de transferir, informá la operación y adjuntá el comprobante en la cuota correspondiente.</p>
        </div>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Historial de facturación</h2><p className="mt-1 text-sm text-muted-foreground">Todas las cuotas y sus estados de pago</p></div><span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">{invoices.length} registros</span></div>
        {invoices.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Todavía no hay cuotas registradas para este gimnasio.</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)] gap-4 border-b border-border bg-muted/30 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:grid"><span>Factura / Período</span><span>Importe</span><span>Vencimiento</span><span>Estado</span><span>Acciones</span></div>
            <div className="divide-y divide-border">
              {invoices.map((invoice) => {
                const pending = ["pending", "overdue"].includes(String(invoice.status));
                const transfer = submitted.get(Number(invoice.id));
                return <div key={Number(invoice.id)} className="p-5 transition-colors hover:bg-muted/10 lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-4 lg:px-6">
                  <div className="mb-3 lg:mb-0"><p className="flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4 text-primary" />Factura #{String(invoice.id)}</p><p className="mt-1 pl-6 text-xs text-muted-foreground">{invoice.period_start && invoice.period_end ? `${date(invoice.period_start)} – ${date(invoice.period_end)}` : "Factura de prueba / sin período"}</p></div>
                  <div className="mb-3 lg:mb-0"><p className="text-xs text-muted-foreground lg:hidden">Importe</p><p className="text-base font-bold tabular-nums">{money(invoice.amount)}</p></div>
                  <div className="mb-3 text-sm lg:mb-0"><p className="text-xs text-muted-foreground lg:hidden">Vencimiento</p>{date(invoice.due_date)}</div>
                  <div className="mb-4 lg:mb-0">{statusBadge(String(invoice.status))}</div>
                  <div>{pending ? <details className="group"><summary className="flex cursor-pointer list-none items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 [&::-webkit-details-marker]:hidden"><CreditCard className="h-4 w-4" />Opciones de pago<span className="text-sm group-open:rotate-180">⌄</span></summary><div className="mt-3 space-y-3 rounded-xl border border-border bg-background/60 p-3"><p className="text-xs font-semibold">Mercado Pago</p><SaaSCheckoutButton invoiceId={Number(invoice.id)} /><div className="border-t border-border pt-3">{transfer ? <p className="text-xs text-muted-foreground">Transferencia: {String(transfer.status)}. {String(transfer.status) === "under_review" && new Date(String(transfer.provisional_until)).getTime() > Date.now() ? `Acceso provisorio hasta ${new Date(String(transfer.provisional_until)).toLocaleString("es-AR")}.` : "Sin acceso provisorio vigente."}</p> : <TransferSubmissionForm invoiceId={Number(invoice.id)} />}</div></div></details> : <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4" />Sin acciones pendientes</span>}</div>
                </div>;
              })}
            </div>
          </div>
        )}
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Mercado Pago está configurado en modo prueba. Las transferencias requieren verificación manual; subir un comprobante no acredita automáticamente la cuota.</p>
      </section>
    </div>
  );
}
