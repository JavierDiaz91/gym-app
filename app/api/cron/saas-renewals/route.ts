import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest): boolean {
  const expected = process.env.SAAS_RENEWAL_CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /i, "") ?? "";
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

// GET remains strictly observational. POST requires an additional pilot flag.
export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const testGymId = Number(process.env.KIVRA_SAAS_ACCESS_TEST_GYM_ID);
  if (!Number.isSafeInteger(testGymId) || testGymId <= 0) {
    return NextResponse.json({ mode: "dry-run", executed: false, reason: "test_gym_not_configured" });
  }
  const invoices = await sql`
    SELECT i.id, i.period_start, i.period_end, i.status, i.due_date
    FROM public.saas_invoices i
    WHERE i.gym_id = ${testGymId}
    ORDER BY i.period_start DESC, i.id DESC LIMIT 24
  `;
  return NextResponse.json({ mode: "dry-run", executed: false, gymId: testGymId, invoices },
    { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (process.env.KIVRA_SAAS_PILOT_INVOICE_GENERATION !== "true") {
    return NextResponse.json({ error: "Generación desactivada" }, { status: 403 });
  }
  const gymId = Number(process.env.KIVRA_SAAS_ACCESS_TEST_GYM_ID);
  const actorId = Number(process.env.KIVRA_SAAS_PILOT_SUPERADMIN_ID);
  if (!Number.isSafeInteger(gymId) || gymId <= 0 ||
      !Number.isSafeInteger(actorId) || actorId <= 0) {
    return NextResponse.json({ error: "Piloto no configurado" }, { status: 503 });
  }
  try {
    const [result] = await sql`
      SELECT invoice_id, result
      FROM public.kivra_generate_monthly_invoice_pilot(${gymId}, CURRENT_DATE, ${actorId})
    `;
    return NextResponse.json({
      gymId, invoiceId: result?.invoice_id ?? null, result: result?.result ?? "none"
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Kivra SaaS pilot invoice generation failed", error);
    return NextResponse.json({ error: "No se pudo generar la cuota piloto" }, { status: 500 });
  }
}
