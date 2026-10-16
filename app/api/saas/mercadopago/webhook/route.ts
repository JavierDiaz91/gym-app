import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validSignature(request: NextRequest, paymentId: string, secret: string): boolean {
  const signature = request.headers.get("x-signature") ?? "";
  const requestId = request.headers.get("x-request-id") ?? "";
  const ts = signature.match(/(?:^|,)\s*ts=([^,]+)/)?.[1];
  const v1 = signature.match(/(?:^|,)\s*v1=([0-9a-fA-F]+)/)?.[1];
  if (!ts || !v1 || !requestId || !/^\d+$/.test(ts)) return false;
  const timestamp = Number(ts);
  // MP uses millisecond timestamps; reject stale or future signatures.
  if (!Number.isSafeInteger(timestamp) || Math.abs(Date.now() - timestamp) > 10 * 60 * 1000) return false;
  const manifest = `id:${paymentId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest();
  const supplied = Buffer.from(v1, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export async function POST(request: NextRequest) {
  const token = process.env.KIVRA_MP_TEST_ACCESS_TOKEN;
  const secret = process.env.KIVRA_MP_TEST_WEBHOOK_SECRET;
  const sellerId = process.env.KIVRA_MP_TEST_SELLER_ID;
  if (!token || !secret || !sellerId) {
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 503 });
  }

  const payload = await request.json().catch(() => null);
  const idFromBody = payload?.data?.id;
  const idFromQuery = request.nextUrl.searchParams.get("data.id");
  const paymentId = String(idFromQuery ?? idFromBody ?? "");
  if (!/^\d{1,30}$/.test(paymentId) || (idFromQuery && idFromBody && idFromQuery !== String(idFromBody))) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  if (!validSignature(request, paymentId, secret)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }
  if (payload?.type !== "payment" && payload?.action !== "payment.updated" && payload?.action !== "payment.created") {
    return NextResponse.json({ received: true });
  }

  try {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store"
    });
    if (!response.ok) {
      console.error("Kivra MP payment fetch failed", response.status);
      return NextResponse.json({ error: "No se pudo verificar el pago" }, { status: 502 });
    }
    const payment = await response.json();
    if (String(payment.id) !== paymentId || String(payment.collector_id) !== sellerId) {
      return NextResponse.json({ error: "Vendedor o pago inválido" }, { status: 403 });
    }
    if (payment.status !== "approved") {
      return NextResponse.json({ received: true, credited: false });
    }
    const match = /^kivra_saas_invoice_(\d+)_gym_(\d+)$/.exec(String(payment.external_reference ?? ""));
    if (!match || payment.currency_id !== "ARS" || !Number.isFinite(Number(payment.transaction_amount))) {
      return NextResponse.json({ error: "Referencia o moneda inválida" }, { status: 422 });
    }
    const invoiceId = Number(match[1]);
    const gymId = Number(match[2]);
    if (!Number.isSafeInteger(invoiceId) || !Number.isSafeInteger(gymId)) {
      return NextResponse.json({ error: "Referencia inválida" }, { status: 422 });
    }
    // The SQL function locks the invoice and atomically rejects mismatched
    // amounts, gyms, references, cancelled invoices and duplicate payment IDs.
    const [result] = await sql`
      SELECT public.settle_kivra_saas_mp_payment(
        ${invoiceId}, ${gymId}, ${paymentId}, ${sellerId},
        ${Number(payment.transaction_amount)}, ${String(payment.currency_id)},
        ${String(payment.external_reference)}
      ) AS credited
    `;
    return NextResponse.json({ received: true, credited: result?.credited === true });
  } catch (error) {
    console.error("Kivra SaaS MP webhook processing failed", error);
    return NextResponse.json({ error: "Error al procesar pago" }, { status: 500 });
  }
}
