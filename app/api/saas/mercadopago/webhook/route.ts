import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SignatureCheck = { valid: true } | { valid: false; reason: string };

function checkSignature(request: NextRequest, signedDataId: string | null, secret: string): SignatureCheck {
  const signature = request.headers.get("x-signature") ?? "";
  const requestId = request.headers.get("x-request-id") ?? "";
  if (!signature) return { valid: false, reason: "missing_signature" };
  if (!requestId) return { valid: false, reason: "missing_request_id" };

  const ts = signature.match(/(?:^|,)\s*ts=([^,]+)/)?.[1];
  const v1 = signature.match(/(?:^|,)\s*v1=([^,]+)/)?.[1];
  if (!ts || !/^\d+$/.test(ts)) return { valid: false, reason: "invalid_timestamp" };
  if (!v1 || !/^[0-9a-fA-F]{64}$/.test(v1)) {
    return { valid: false, reason: "invalid_signature_format" };
  }

  const timestamp = Number(ts);
  if (!Number.isSafeInteger(timestamp)) return { valid: false, reason: "invalid_timestamp" };
  // Support both seconds and milliseconds while keeping the original ts in
  // the signed manifest. Do not log timestamps or signature contents.
  const timestampMs = ts.length <= 10 ? timestamp * 1000 : timestamp;
  if (!Number.isSafeInteger(timestampMs) || Math.abs(Date.now() - timestampMs) > 10 * 60 * 1000) {
    return { valid: false, reason: "timestamp_out_of_window" };
  }

  // Mercado Pago signs the data.id URL parameter when supplied. For legacy
  // notifications with only ?id=..., accept that ID only when its HMAC
  // actually matches; never bypass cryptographic verification.
  const legacyId = request.nextUrl.searchParams.get("id");
  const candidates = signedDataId
    ? [{ name: "dataId", id: signedDataId }]
    : [
        { name: "noId", id: null },
        ...(legacyId && /^\\d{1,30}$/.test(legacyId)
          ? [{ name: "legacyId", id: legacyId }]
          : [])
      ];
  const supplied = Buffer.from(v1, "hex");
  const matched = candidates.find(({ id }) => {
    const idSegment = id ? `id:${id.toLowerCase()};` : "";
    const manifest = `${idSegment}request-id:${requestId};ts:${ts};`;
    const expected = createHmac("sha256", secret).update(manifest).digest();
    return timingSafeEqual(expected, supplied);
  });
  if (!matched) {
    console.warn("Kivra MP HMAC diagnostics", {
      candidates: candidates.map(({ name }) => name),
      hasSignedDataId: signedDataId !== null,
      signatureHasTs: Boolean(ts),
      signatureHasV1: Boolean(v1),
      requestIdPresent: Boolean(requestId)
    });
    return { valid: false, reason: "signature_mismatch" };
  }
  return { valid: true };
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
  const legacyIdFromQuery = request.nextUrl.searchParams.get("id");
  const ids = [idFromBody, idFromQuery, legacyIdFromQuery]
    .filter((id) => id !== null && id !== undefined)
    .map(String);
  const paymentId = ids[0] ?? "";
  if (!/^\d{1,30}$/.test(paymentId) || ids.some((id) => id !== paymentId)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  const legacyTopic = request.nextUrl.searchParams.get("topic");
  const queryType = request.nextUrl.searchParams.get("type");
  // Merchant orders are not payments; acknowledge without touching invoices.
  if (legacyTopic === "merchant_order" || queryType === "merchant_order" || payload?.type === "merchant_order") {
    return NextResponse.json({ received: true, ignored: "merchant_order" });
  }
  // Require a valid signature for modern webhooks and legacy IPN alike.
  // Legacy ?id=... is used to fetch the payment but is NOT part of the
  // signed manifest. Only the query parameter data.id is signed.
  const signatureCheck = checkSignature(request, idFromQuery, secret);
  if (!signatureCheck.valid) {
    console.warn("Kivra SaaS MP webhook signature rejected", signatureCheck.reason);
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }
  if (payload?.type !== "payment" && payload?.action !== "payment.updated" && payload?.action !== "payment.created" && legacyTopic !== "payment" && queryType !== "payment") {
    return NextResponse.json({ received: true });
  }

  try {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store"
    });
    if (response.status === 404) {
      // A signed simulator event may reference a fictitious payment ID.
      // Acknowledge the notification without creating a payment or changing an invoice.
      console.info("Kivra MP webhook: payment not found; no settlement performed");
      return NextResponse.json(
        { received: true, credited: false, reason: "payment_not_found" },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }
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
