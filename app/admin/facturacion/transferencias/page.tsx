import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import { TransferReviewControls } from "./TransferReviewControls";

export const dynamic = "force-dynamic";

export default async function SaaSTransfersPage() {
  const session = await getSession();
  if (!session || session.role !== "superadmin") redirect("/admin");
  const transfers = await sql`
    SELECT t.id, t.invoice_id, t.gym_id, g.name AS gym_name,
           t.operation_number, t.receipt_storage_key, t.status,
           t.submitted_at, t.provisional_until, t.reviewed_at,
           t.review_notes, i.amount, i.period_start, i.period_end,
           i.status AS invoice_status
    FROM public.saas_transfer_submissions t
    JOIN public.gyms g ON g.id = t.gym_id
    JOIN public.saas_invoices i ON i.id = t.invoice_id AND i.gym_id = t.gym_id
    ORDER BY CASE WHEN t.status = 'under_review' THEN 0 ELSE 1 END,
             t.submitted_at DESC
    LIMIT 100
  `;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Transferencias a Kivra</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Revisá el ingreso real en tu cuenta de Mercado Pago antes de aprobar.
          El comprobante informado no acredita por sí solo el pago.
        </p>
      </div>
      {transfers.length === 0 ? (
        <div className="rounded-xl border p-6 text-sm">No hay transferencias informadas.</div>
      ) : transfers.map((t) => (
        <section key={Number(t.id)} className="space-y-3 rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">{String(t.gym_name)} · Factura #{String(t.invoice_id)}</h2>
            <span className="text-sm">{String(t.status)}</span>
          </div>
          <p className="text-sm">Importe: {Number(t.amount).toLocaleString("es-AR", { style: "currency", currency: "ARS" })}</p>
          <p className="text-sm">Operación: <strong>{String(t.operation_number)}</strong></p>
          <p className="text-xs text-muted-foreground">Referencia privada del comprobante: {String(t.receipt_storage_key)}</p>
          <p className="text-xs text-muted-foreground">Enviado: {new Date(String(t.submitted_at)).toLocaleString("es-AR")}. Acceso provisorio hasta: {new Date(String(t.provisional_until)).toLocaleString("es-AR")}.</p>
          <p className="text-xs text-muted-foreground">Estado de factura: {String(t.invoice_status)}</p>
          {t.status === "under_review" && <TransferReviewControls id={Number(t.id)} />}
          {t.review_notes && <p className="text-xs">Revisión: {String(t.review_notes)}</p>}
        </section>
      ))}
    </div>
  );
}
