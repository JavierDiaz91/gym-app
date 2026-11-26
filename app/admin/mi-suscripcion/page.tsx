import Link from "next/link";
import { TransferButton } from "./TransferButton";
import { SaaSCheckoutButton } from "./SaaSCheckoutButton";
import { redirect } from "next/navigation";
import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const money = (v: unknown) => Number(v).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
const date = (v: unknown) => v ? new Date(String(v)).toLocaleDateString("es-AR", { timeZone: "UTC" }) : "—";

export default async function MiSuscripcionPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin" || !session.gymId) redirect("/admin");

  const [gym] = await sql`SELECT name FROM gyms WHERE id = ${session.gymId} LIMIT 1`;
  const [subscription] = await sql`
    SELECT s.status, s.current_period_start, s.current_period_end, s.next_billing_date,
           p.name AS plan_name, COALESCE(s.price_override, p.monthly_price) AS price
    FROM gym_saas_subscriptions s JOIN saas_plans p ON p.id = s.plan_id
    WHERE s.gym_id = ${session.gymId} LIMIT 1
  `;
  const invoices = await sql`
    SELECT id, period_start, period_end, amount, status, due_date, paid_at,
    EXISTS (SELECT 1 FROM public.saas_transfer_submissions t WHERE t.invoice_id = saas_invoices.id AND t.gym_id = saas_invoices.gym_id AND t.status = 'under_review') AS transfer_pending
    FROM saas_invoices WHERE gym_id = ${session.gymId}
    ORDER BY created_at DESC LIMIT 100
  `;

  const [bank] = await sql`SELECT bank_name,bank_account_holder,bank_cbu,bank_alias,mp_payments_enabled,bank_transfers_enabled FROM public.saas_settings WHERE id=1`;
  const mpEnabled = bank?.mp_payments_enabled === true && process.env.KIVRA_SAAS_TEST_CHECKOUT_ENABLED === "true";
  const bankEnabled = bank?.bank_transfers_enabled === true && Boolean(bank.bank_account_holder && (bank.bank_cbu || bank.bank_alias));
  const open = invoices.filter(i => ["pending", "overdue"].includes(i.status));
  const total = open.reduce((sum, i) => sum + Number(i.amount), 0);
  const statusLabels: Record<string, string> = { active: "Activa", pending: "Pendiente", overdue: "Vencida", cancelled: "Cancelada", suspended: "Suspendida", trial: "En prueba", expired: "Vencida" };
  return <div className="mx-auto max-w-7xl space-y-6 pb-8">
    <header className="border-b border-border pb-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Kivra SaaS / Facturación</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Mi suscripción Kivra</h1>
      <p className="mt-1 text-sm text-muted-foreground">Administrá el plan, los pagos y los recibos de {gym?.name || "tu gimnasio"}.</p>
    </header>
    <section className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border border-primary/25 bg-card p-5 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Tu plan actual</p>
          {subscription && <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${subscription.status === "active" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-border text-muted-foreground"}`}>{statusLabels[subscription.status] || String(subscription.status)}</span>}
        </div>
        {subscription ? <>
          <h2 className="mt-3 text-2xl font-bold">{subscription.plan_name}</h2>
          <div className="mt-5 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <div><p className="text-xs text-muted-foreground">Precio mensual</p><p className="mt-1 text-xl font-bold tabular-nums">{subscription.price == null ? "A definir" : money(subscription.price)}</p></div>
            <div><p className="text-xs text-muted-foreground">Próximo vencimiento</p><p className="mt-1 text-xl font-semibold">{date(subscription.next_billing_date)}</p></div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Período vigente: {date(subscription.current_period_start)} al {date(subscription.current_period_end)}</p>
        </> : <p className="mt-4 text-sm text-muted-foreground">Todavía no hay una suscripción asignada.</p>}
      </div>
      <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5">
        <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saldo pendiente</p><p className="mt-3 text-3xl font-bold tracking-tight tabular-nums">{money(total)}</p><p className="mt-2 text-sm text-muted-foreground">{open.length} {open.length === 1 ? "comprobante pendiente" : "comprobantes pendientes"}</p></div>
        <a href="#comprobantes" className="mt-5 text-sm font-semibold text-primary hover:underline">Consultar comprobantes →</a>
      </div>
    </section>
    {subscription && open.length > 0 && bankEnabled && <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Datos para transferencia</h2><span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">Acreditación manual</span></div>
      <p className="mt-1 text-sm text-muted-foreground">Transferí a esta cuenta y adjuntá el comprobante desde el cobro correspondiente.</p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Banco",bank.bank_name],["Titular",bank.bank_account_holder],["CBU / CVU",bank.bank_cbu],["Alias",bank.bank_alias]].filter(([,value])=>value).map(([label,value])=><div key={String(label)} className="min-w-0 rounded-xl border border-border bg-background/40 p-3"><dt className="text-xs text-muted-foreground">{String(label)}</dt><dd className="mt-1 break-all text-sm font-semibold">{String(value)}</dd></div>)}</dl>
    </section>}
    {!mpEnabled && !bankEnabled && open.length > 0 && <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">No hay medios de pago disponibles por el momento. Contactá a Kivra.</p>}
    <section id="comprobantes" className="scroll-mt-6 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Comprobantes e historial de cobros</h2><span className="text-xs text-muted-foreground">{invoices.length} registros</span></div>
      <p className="mt-1 text-sm text-muted-foreground">Consultá tus pagos y descargá los recibos comerciales. No son facturas fiscales.</p>
      {invoices.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Todavía no hay comprobantes disponibles.</p> : <div className="mt-5 space-y-3">
      {[...invoices].sort((a,b)=>Number(["pending","overdue"].includes(b.status))-Number(["pending","overdue"].includes(a.status))).map(i => {
        const payable = ["pending","overdue"].includes(i.status);
        const reviewing = payable && i.transfer_pending;
        const label = i.status === "paid" ? "Pagado" : reviewing ? "En revisión" : i.status === "overdue" ? "Vencido" : i.status === "cancelled" ? "Cancelado" : "Pendiente";
        const tone = i.status === "paid" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : payable ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400" : "border-border text-muted-foreground";
        return <article key={i.id} className="rounded-xl border border-border bg-background/30 p-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
            <div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">KIV-{String(i.id).padStart(6,"0")}</p><span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${tone}`}>{label}</span></div>
              <p className="mt-2 text-xs text-muted-foreground">{i.period_start && i.period_end ? `Período: ${date(i.period_start)} – ${date(i.period_end)}` : "Sin período asociado"}</p>
              {i.status === "paid" && i.paid_at && <p className="mt-1 text-xs text-muted-foreground">Pagado el {date(i.paid_at)}</p>}
              {payable && i.due_date && <p className="mt-1 text-xs text-muted-foreground">Vencimiento: {date(i.due_date)}</p>}
            </div>
            <p className="text-xl font-bold tabular-nums sm:text-right">{money(i.amount)}</p>
          </div>
          {reviewing && <p className="mt-3 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">Recibimos tu comprobante. Kivra verificará la acreditación bancaria.</p>}
          {i.status !== "cancelled" && <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3">
            {mpEnabled && payable && !reviewing && <SaaSCheckoutButton invoiceId={Number(i.id)} />}
            {bankEnabled && payable && !reviewing && <TransferButton invoiceId={Number(i.id)} amount={money(i.amount)} />}
            <Link className="inline-flex rounded-lg border border-border px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10 sm:ml-auto" href={`/admin/mi-suscripcion/comprobante/${i.id}`}>{i.status === "paid" ? "Ver recibo" : "Ver aviso"}</Link>
          </div>}
        </article>;
      })}</div>}
      <p className="mt-4 text-xs text-muted-foreground">Los recibos están disponibles únicamente para pagos confirmados.</p>
    </section>
  </div>;
}
