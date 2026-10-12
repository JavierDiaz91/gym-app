import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "node:crypto"
import { sql } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function authorized(request: NextRequest): boolean {
  const expected = process.env.SAAS_RENEWAL_CRON_SECRET
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /i, "") ?? ""
  if (!expected || !supplied) return false
  const a = Buffer.from(expected)
  const b = Buffer.from(supplied)
  return a.length === b.length && timingSafeEqual(a, b)
}

// Modo observacion: no genera facturas, no cambia planes y no realiza cobros.
export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const candidates = await sql`
      SELECT s.id AS subscription_id, s.gym_id, s.plan_id,
             s.pending_plan_id, s.current_period_end,
             EXISTS (
               SELECT 1 FROM public.saas_invoices i
               WHERE i.subscription_id = s.id
                 AND i.period_start = s.current_period_start
                 AND i.period_end = s.current_period_end
                 AND i.status = 'paid'
             ) AS previous_period_paid
      FROM public.gym_saas_subscriptions s
      WHERE s.status = 'active'
        AND s.current_period_end <= CURRENT_DATE
      ORDER BY s.current_period_end, s.id
      LIMIT 100
    `
    return NextResponse.json({
      mode: "dry-run",
      executed: false,
      checked_at: new Date().toISOString(),
      due_count: candidates.length,
      eligible_count: candidates.filter((row) => row.previous_period_paid).length,
      candidates,
    }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("SaaS renewal preview failed", error)
    return NextResponse.json({ error: "No se pudo consultar las renovaciones" }, { status: 500 })
  }
}
