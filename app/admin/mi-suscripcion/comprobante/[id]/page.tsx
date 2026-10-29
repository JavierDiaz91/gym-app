import { notFound, redirect } from "next/navigation";
import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

const money = (v: unknown) => Number(v).toLocaleString("es-AR", { style: "currency", currency: "ARS" });
const date = (v: unknown) => v ? new Date(String(v)).toLocaleDateString("es-AR", { timeZone: "UTC" }) : "—";

export default async function ComprobantePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin" || !session.gymId) redirect("/admin");
  const { id } = await params;
  const invoiceId = Number(id);
  if (!Number.isSafeInteger(invoiceId) || invoiceId <= 0) notFound();
  const [invoice] = await sql`
    SELECT i.id, i.amount, i.status, i.period_start, i.period_end, i.due_date, i.paid_at,
           i.external_reference, i.created_at, g.name AS gym_name, p.name AS plan_name
    FROM saas_invoices i JOIN gyms g ON g.id = i.gym_id
    LEFT JOIN gym_saas_subscriptions s ON s.id = i.subscription_id AND s.gym_id = i.gym_id
    LEFT JOIN saas_plans p ON p.id = s.plan_id
    WHERE i.id = ${invoiceId} AND i.gym_id = ${session.gymId} LIMIT 1
  `;
  if (!invoice || invoice.status === "cancelled") notFound();
  const paid = invoice.status === "paid";
  return <div className="mx-auto max-w-3xl space-y-5">
    <div className="print:hidden"><PrintButton /></div>
    <article className="overflow-hidden rounded-2xl border border-border bg-white text-slate-900 shadow-lg print:rounded-none print:border-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-4 bg-[#071827] px-8 py-7 text-white print:bg-[#071827] print:text-white">
        <div><p className="text-3xl font-extrabold tracking-widest text-[#00D5D0]">KIVRA</p><p className="mt-1 text-sm text-slate-300">Plataforma de gestión de gimnasios</p></div>
        <div className="text-right"><p className="text-lg font-bold">{paid ? "RECIBO DE PAGO" : "AVISO DE PAGO"}</p><p className="text-sm text-slate-300">KIV-{String(invoice.id).padStart(6, "0")}</p></div>
      </header>
      <div className="space-y-7 p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <div><p className="text-xs uppercase tracking-wider text-slate-500">Gimnasio</p><p className="mt-1 text-lg font-semibold">{invoice.gym_name}</p></div>
          <div><p className="text-xs uppercase tracking-wider text-slate-500">{paid ? "Fecha de pago registrada" : "Vencimiento"}</p><p className="mt-1 text-lg font-semibold">{date(paid ? invoice.paid_at : invoice.due_date)}</p></div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500">Concepto</p>
          <p className="mt-2 font-semibold">Suscripción Kivra SaaS — {invoice.plan_name || "Plan contratado"}</p>
          <p className="mt-1 text-sm text-slate-600">Período: {date(invoice.period_start)} al {date(invoice.period_end)}</p>
          <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4"><span className="font-semibold">{paid ? "Total recibido" : "Total a pagar"}</span><span className="text-2xl font-extrabold">{money(invoice.amount)}</span></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm">Estado: <strong>{paid ? "Pago registrado" : invoice.status === "overdue" ? "Vencido" : "Pendiente"}</strong></p><p className="text-sm text-slate-600">Emitido: {date(invoice.created_at)}</p></div>
        {invoice.external_reference && <p className="break-all text-xs text-slate-600">Referencia externa: {invoice.external_reference}</p>}
        <div className="border-t border-slate-200 pt-5 text-xs leading-relaxed text-slate-500">
          Documento comercial de Kivra. No es una factura fiscal ni reemplaza comprobantes emitidos conforme a la normativa tributaria.
          {paid ? " El pago figura registrado en Kivra." : " Este aviso no acredita que se haya recibido un pago."}
        </div>
      </div>
    </article>
  </div>;
}
