import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/session";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const cookie = (await cookies()).get("session")?.value;
    const session = cookie ? await verifySessionToken(cookie) : null;
    if (!session || session.role !== "admin" || session.gymId == null) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const token = process.env.KIVRA_MP_TEST_ACCESS_TOKEN;
    const publicUrl = process.env.KIVRA_PUBLIC_URL;
    if (!token || !publicUrl || !/^https:\/\//.test(publicUrl)) {
      return NextResponse.json({ error: "El pago online todavía no está configurado" }, { status: 503 });
    }

    const body = await request.json().catch(() => null);
    const invoiceId = body?.invoiceId;
    if (!Number.isSafeInteger(invoiceId) || invoiceId <= 0) {
      return NextResponse.json({ error: "Factura inválida" }, { status: 400 });
    }
    const [invoice] = await sql`
      SELECT i.id, i.amount, i.status, i.gym_id, i.period_start, i.period_end,
             g.name AS gym_name
      FROM public.saas_invoices i
      JOIN public.gyms g ON g.id = i.gym_id
      WHERE i.id = ${invoiceId} AND i.gym_id = ${session.gymId}
    `;
    if (!invoice || !["pending", "overdue"].includes(String(invoice.status))) {
      return NextResponse.json({ error: "La cuota no está pendiente de pago" }, { status: 409 });
    }
    const amount = Number(invoice.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Importe de factura inválido" }, { status: 409 });
    }

    const origin = new URL(publicUrl).origin;
    const webhookUrlValue = process.env.KIVRA_MP_TEST_NOTIFICATION_URL;
    if (!webhookUrlValue) {
      return NextResponse.json({ error: "Webhook de prueba no configurado" }, { status: 503 });
    }
    let webhookUrl: URL;
    try {
      webhookUrl = new URL(webhookUrlValue);
    } catch {
      return NextResponse.json({ error: "URL de webhook inválida" }, { status: 503 });
    }
    if (
      webhookUrl.protocol !== "https:" ||
      webhookUrl.origin !== origin ||
      webhookUrl.pathname !== "/api/saas/mercadopago/webhook" ||
      !webhookUrl.searchParams.get("x-vercel-protection-bypass") ||
      webhookUrl.username ||
      webhookUrl.password ||
      webhookUrl.hash
    ) {
      return NextResponse.json({ error: "URL de webhook inválida" }, { status: 503 });
    }
    const preference = {
      items: [{
        id: `kivra-saas-invoice-${invoice.id}`,
        title: `Kivra SaaS - cuota ${String(invoice.period_start).slice(0, 10)}`,
        quantity: 1,
        currency_id: "ARS",
        unit_price: amount
      }],
      external_reference: `kivra_saas_invoice_${invoice.id}_gym_${session.gymId}`,
      back_urls: {
        success: `${origin}/admin/mi-suscripcion`,
        failure: `${origin}/admin/mi-suscripcion`,
        pending: `${origin}/admin/mi-suscripcion`
      },
      notification_url: webhookUrl.toString()
    };
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `kivra-saas-pref-${invoice.id}-${crypto.randomUUID()}`
      },
      body: JSON.stringify(preference),
      cache: "no-store"
    });
    if (!response.ok) {
      console.error("Kivra SaaS MP preference failed", response.status);
      return NextResponse.json({ error: "No se pudo iniciar el pago" }, { status: 502 });
    }
    const result = await response.json();
    // Test mode only: never fall back to a live checkout URL.
    const checkoutUrl = result.sandbox_init_point;
    if (typeof checkoutUrl !== "string" || !checkoutUrl.startsWith("https://")) {
      return NextResponse.json({ error: "Mercado Pago no devolvió un checkout de prueba" }, { status: 502 });
    }
    return NextResponse.json({ checkoutUrl }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Kivra SaaS preference error", error);
    return NextResponse.json({ error: "No se pudo iniciar el pago" }, { status: 500 });
  }
}
