import { getSaaSBillingOverviewAction, getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import SaaSBillingClient from "./SaaSBillingClient";
import TransferReviewButtons from "./TransferReviewButtons";

export default async function FacturacionSaaSPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "superadmin") {
    redirect("/admin");
  }

  const result = await getSaaSBillingOverviewAction();

  const subscriptions =
    result.success && Array.isArray(result.subscriptions)
      ? result.subscriptions
      : [];

  const invoices =
    result.success && Array.isArray(result.invoices)
      ? result.invoices
      : [];

  const transfers = await sql`
    SELECT t.id, t.invoice_id, t.operation_number, t.status, t.submitted_at,
           g.name AS gym_name, i.amount, i.status AS invoice_status, t.review_notes
    FROM saas_transfer_submissions t
    JOIN saas_invoices i ON i.id = t.invoice_id AND i.gym_id = t.gym_id
    JOIN gyms g ON g.id = t.gym_id
    ORDER BY (t.status = 'under_review') DESC, t.submitted_at DESC
  `.catch(() => null);

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Kivra SaaS
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Facturación</h1>
        <p className="mt-1 text-muted-foreground">
          Control de suscripciones y cobros de los gimnasios hacia Kivra.
        </p>
      </div>

      {!result.success && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          No se pudo cargar la facturación SaaS.
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-xl font-semibold">Transferencias bancarias</h2>
        <p className="text-sm text-muted-foreground">Comprobantes informados por los gimnasios.</p>
        {transfers === null ? <p className="text-destructive">No se pudieron cargar las transferencias.</p> : <>
          <div className="grid gap-3 sm:grid-cols-3">
            {([["under_review", "En revisión"], ["approved", "Aprobadas"], ["rejected", "Rechazadas"]] as const).map(([status, label]) => (
              <div key={status} className="rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{transfers.filter(t => t.status === status).length}</p>
              </div>
            ))}
          </div>
          {transfers.length === 0 && <p className="text-muted-foreground">Todavía no hay transferencias informadas.</p>}
          {transfers.map(t => (
            <div key={String(t.id)} className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex flex-wrap justify-between gap-2">
                <div><p className="font-semibold">{String(t.gym_name)}</p><p className="text-sm text-muted-foreground">Factura #{String(t.invoice_id)}</p></div>
                <p className="font-semibold">{Number(t.amount).toLocaleString("es-AR", {style:"currency", currency:"ARS"})}</p>
              </div>
              <p className="text-sm">Operación: {String(t.operation_number)}</p>
              <p className="text-sm text-muted-foreground">{new Date(t.submitted_at).toLocaleString("es-AR", {timeZone:"America/Argentina/Buenos_Aires"})}</p>
              <p className="text-sm font-medium">{t.status === "under_review" ? "En revisión" : t.status === "approved" ? "Aprobada" : t.status === "rejected" ? "Rechazada" : String(t.status)}</p>
              <a target="_blank" rel="noopener noreferrer" href={`/api/saas/transfers/receipt?id=${encodeURIComponent(String(t.id))}`} className="inline-flex rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10">
                Ver comprobante
              </a>
              {t.status === "under_review" && <TransferReviewButtons id={String(t.id)} canApprove={["pending", "overdue"].includes(String(t.invoice_status))} />}
              {t.review_notes && <p className="text-sm text-muted-foreground">Observaciones: {String(t.review_notes)}</p>}
            </div>
          ))}
        </>}
      </section>

      <SaaSBillingClient
        initialSubscriptions={subscriptions as any[]}
        initialInvoices={invoices as any[]}
      />
    </div>
  );
}
