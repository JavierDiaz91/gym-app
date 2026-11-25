import Link from "next/link";
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
    SELECT id, period_start, period_end, amount, status, due_date, paid_at
    FROM saas_invoices WHERE gym_id = ${session.gymId}
    ORDER BY created_at DESC LIMIT 100
  `;

  const [bank] = await sql`SELECT bank_name,bank_account_holder,bank_cbu,bank_alias FROM public.saas_settings WHERE id=1`;
  return <div className="space-y-6">
    <div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Kivra SaaS</p>
      <h1 className="mt-2 text-2xl sm:text-3xl font-bold">Mi suscripción Kivra</h1>
      <p className="mt-1 text-muted-foreground">Plan, avisos de pago y recibos de {gym?.name || "tu gimnasio"}.</p></div>
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      {subscription ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div><p className="text-sm text-muted-foreground">Plan contratado</p><p className="text-xl font-bold">{subscription.plan_name}</p></div>
        <div><p className="text-sm text-muted-foreground">Precio mensual</p><p className="text-xl font-bold">{subscription.price == null ? "A definir" : money(subscription.price)}</p></div>
        <div><p className="text-sm text-muted-foreground">Próximo vencimiento</p><p className="text-xl font-bold">{date(subscription.next_billing_date)}</p></div>
        <div className="col-span-2 sm:col-span-3 text-sm text-muted-foreground">Estado: {subscription.status} · Período: {date(subscription.current_period_start)} al {date(subscription.current_period_end)}</div>
      </div> : <p className="text-muted-foreground">Todavía no hay una suscripción SaaS asignada a este gimnasio.</p>}
    </section>
    {subscription && invoices.some(i=>i.status==="pending" || i.status==="overdue") && bank?.bank_account_holder && (bank.bank_cbu || bank.bank_alias) && <section className="rounded-2xl border border-border bg-card p-4 sm:p-6"><h2 className="text-xl font-semibold">Pago por transferencia</h2><p className="mt-1 text-sm text-muted-foreground">Cuenta receptora de Kivra. Contactá a Kivra para confirmar el pago; la transferencia no se acredita automáticamente.</p><dl className="mt-4 grid gap-3 sm:grid-cols-2">{[["Banco",bank.bank_name],["Titular",bank.bank_account_holder],["CBU / CVU",bank.bank_cbu],["Alias",bank.bank_alias]].filter(([,value])=>value).map(([label,value])=><div key={String(label)}><dt className="text-sm text-muted-foreground">{String(label)}</dt><dd className="break-all font-medium">{String(value)}</dd></div>)}</dl></section>}
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <h2 className="text-xl font-semibold">Comprobantes e historial de cobros</h2>
      <p className="mt-1 text-sm text-muted-foreground">Los recibos solo se muestran cuando el pago está registrado como confirmado. Los documentos son comerciales, no facturas fiscales.</p>
      {invoices.length === 0 ? <p className="mt-6 text-muted-foreground">Todavía no hay comprobantes disponibles.</p> :
      <><div className="mt-5 hidden overflow-x-auto lg:block"><table className="min-w-[640px] w-full text-left text-sm">
        <thead><tr className="border-b border-border text-muted-foreground"><th className="pb-3">Número</th><th className="pb-3">Período</th><th className="pb-3">Importe</th><th className="pb-3">Estado</th><th className="pb-3 text-right">Documento</th></tr></thead>
        <tbody>{invoices.map((i) => <tr key={i.id} className="border-b border-border/60">
          <td className="py-3">KIV-{String(i.id).padStart(6, "0")}</td>
          <td className="py-3">{date(i.period_start)} – {date(i.period_end)}</td>
          <td className="py-3">{money(i.amount)}</td>
          <td className="py-3">{i.status === "paid" ? "Pagado" : i.status === "overdue" ? "Vencido" : i.status === "cancelled" ? "Cancelado" : "Pendiente"}</td>
          <td className="py-3 text-right"><div className="flex flex-col items-end gap-2">{process.env.KIVRA_SAAS_TEST_CHECKOUT_ENABLED === "true" && (i.status === "pending" || i.status === "overdue") && <SaaSCheckoutButton invoiceId={Number(i.id)} />}{i.status === "cancelled" ? "—" :
            <Link className="font-semibold text-primary hover:underline" href={`/admin/mi-suscripcion/comprobante/${i.id}`}>{i.status === "paid" ? "Ver recibo" : "Ver aviso"}</Link>}</div></td>
        </tr>)}</tbody>
      </table></div><div className="mt-4 grid gap-2 lg:hidden">{invoices.map(i => <article key={i.id} className="min-w-0 space-y-1.5 rounded-xl border p-3"><div className="flex flex-wrap justify-between gap-2"><strong>KIV-{String(i.id).padStart(6,"0")}</strong><strong>{money(i.amount)}</strong></div><p className="text-xs text-muted-foreground">{date(i.period_start)} – {date(i.period_end)}</p><p className="text-sm">{i.status === "paid" ? "Pagado" : i.status === "overdue" ? "Vencido" : i.status === "cancelled" ? "Cancelado" : "Pendiente"}</p>{process.env.KIVRA_SAAS_TEST_CHECKOUT_ENABLED === "true" && (i.status === "pending" || i.status === "overdue") && <SaaSCheckoutButton invoiceId={Number(i.id)} />}{i.status !== "cancelled" && <Link className="block font-semibold text-primary" href={`/admin/mi-suscripcion/comprobante/${i.id}`}>{i.status === "paid" ? "Ver recibo" : "Ver aviso"}</Link>}</article>)}</div></>}
    </section>
  </div>;
}
