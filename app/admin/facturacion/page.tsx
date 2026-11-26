import { getSaaSBillingOverviewAction, getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import SaaSBillingClient from "./SaaSBillingClient";
import TransferQueue from "./TransferQueue";

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

      {transfers === null ? <p className="text-destructive">No se pudieron cargar las transferencias.</p> : <TransferQueue rows={transfers.map(t=>({id:String(t.id),invoice_id:String(t.invoice_id),operation_number:String(t.operation_number),status:String(t.status),submitted_at:new Date(t.submitted_at).toISOString(),gym_name:String(t.gym_name),amount:Number(t.amount),invoice_status:String(t.invoice_status),review_notes:t.review_notes==null?null:String(t.review_notes)}))}/>}

      <SaaSBillingClient
        initialSubscriptions={subscriptions as any[]}
        initialInvoices={invoices as any[]}
      />
    </div>
  );
}
