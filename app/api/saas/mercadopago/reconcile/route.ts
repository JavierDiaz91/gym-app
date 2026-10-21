import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/session";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = (await cookies()).get("session")?.value;
    const session = sessionCookie ? await verifySessionToken(sessionCookie) : null;
    if (!session || session.role !== "admin" || !Number.isSafeInteger(session.gymId) || (session.gymId ?? 0) <= 0) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Only same-origin requests from the configured preview application.
    const publicUrl = process.env.KIVRA_PUBLIC_URL;
    const origin = request.headers.get("origin");
    if (!publicUrl || !origin || origin !== new URL(publicUrl).origin) {
      return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
    }

    const token = process.env.KIVRA_MP_TEST_ACCESS_TOKEN;
    const sellerId = process.env.KIVRA_MP_TEST_SELLER_ID;
    if (!token || !sellerId) {
      return NextResponse.json({ error: "Conciliación no configurada" }, { status: 503 });
    }

    const body = await request.json().catch(() => null);
    const invoiceId = body?.invoiceId;
    const paymentId = body?.paymentId;
    if (!Number.isSafeInteger(invoiceId) || invoiceId <= 0 ||
        typeof paymentId !== "string" || !/^\d{1,30}$/.test(paymentId)) {
      return NextResponse.json({ error: "Datos de conciliación inválidos" }, { status: 400 });
    }

    const [invoice] = await sql`
      SELECT id, gym_id, status
      FROM public.saas_invoices
      WHERE id = ${invoiceId} AND gym_id = ${session.gymId}
    `;
    if (!invoice) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
    }
    if (!["pending", "overdue"].includes(String(invoice.status))) {
      return NextResponse.json({ error: "La factura no está pendiente" }, { status: 409 });
    }

    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store"
    });
    if (!response.ok) {
      console.error("Kivra SaaS reconciliation payment lookup failed", response.status);
      return NextResponse.json({ error: "No se pudo verificar el pago" }, { status: 502 });
    }
    const payment = await response.json();
    if (String(payment.id) !== paymentId || String(payment.collector_id) !== sellerId) {
      return NextResponse.json({ error: "El pago no pertenece al vendedor configurado" }, { status: 403 });
    }
    if (payment.status !== "approved") {
      return NextResponse.json({ error: "El pago no está aprobado" }, { status: 409 });
    }

    const reference = `kivra_saas_invoice_${invoiceId}_gym_${session.gymId}`;
    const amount = Number(payment.transaction_amount);
    if (payment.external_reference !== reference || payment.currency_id !== "ARS" ||
        !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Referencia, moneda o importe inválido" }, { status: 422 });
    }

    // The DB function atomically validates invoice amount, gym, payment ID,
    // reference, status and duplicates before settling.
    const [result] = await sql`
      SELECT public.settle_kivra_saas_mp_payment(
        ${invoiceId}, ${session.gymId}, ${paymentId}, ${sellerId},
        ${amount}, ${String(payment.currency_id)}, ${reference}
      ) AS credited
    `;
    return NextResponse.json(
      { verified: true, credited: result?.credited === true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Kivra SaaS reconciliation failed", error);
    return NextResponse.json({ error: "No se pudo conciliar el pago" }, { status: 500 });
  }
}
