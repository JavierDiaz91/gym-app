import { sql } from "../db/neon";

const paymentId = "183589179992";
const memberId = 8;
const tenantId = 2;
const planId = 4;
const paidAmount = 1500;
const durationMonths = 1;

async function main() {
  const [beforeSub] = await sql`
    SELECT id, member_id, start_date, end_date, updated_at
    FROM subscriptions
    WHERE member_id = ${memberId}
    ORDER BY id DESC
    LIMIT 1
  `;

  const [beforePaymentCount] = await sql`
    SELECT COUNT(*)::int AS count
    FROM payments
    WHERE transaction_id = ${paymentId}
  `;

  console.log("ANTES");
  console.log({
    subscription: beforeSub,
    paymentCount: Number(beforePaymentCount?.count || 0),
  });

  const applied = await sql`
    WITH payment_lock AS MATERIALIZED (
      SELECT pg_advisory_xact_lock(hashtext(${paymentId})::bigint)
    ),
    existing_payment AS MATERIALIZED (
      SELECT p.id
      FROM payments p
      CROSS JOIN payment_lock
      WHERE p.transaction_id = ${paymentId}
      LIMIT 1
    ),
    latest_sub AS MATERIALIZED (
      SELECT s.id
      FROM subscriptions s
      CROSS JOIN payment_lock
      WHERE s.member_id = ${memberId}
      ORDER BY s.id DESC
      LIMIT 1
    ),
    updated_sub AS (
      UPDATE subscriptions s
      SET
        status = 'active',
        plan_id = ${planId},
        start_date = CASE
          WHEN s.end_date IS NOT NULL AND s.end_date >= CURRENT_DATE
            THEN s.start_date
          ELSE CURRENT_DATE
        END,
        end_date = CASE
          WHEN s.end_date IS NOT NULL AND s.end_date >= CURRENT_DATE
            THEN s.end_date + (${durationMonths} || ' month')::INTERVAL
          ELSE CURRENT_DATE + (${durationMonths} || ' month')::INTERVAL
        END,
        payment_status = 'paid',
        amount_paid = ${paidAmount},
        updated_at = NOW()
      WHERE s.id = (SELECT id FROM latest_sub)
        AND NOT EXISTS (SELECT 1 FROM existing_payment)
      RETURNING s.id
    ),
    inserted_sub AS (
      INSERT INTO subscriptions (
        member_id,
        plan_id,
        status,
        start_date,
        end_date,
        payment_status,
        amount_paid,
        created_at,
        updated_at
      )
      SELECT
        ${memberId},
        ${planId},
        'active',
        CURRENT_DATE,
        CURRENT_DATE + (${durationMonths} || ' month')::INTERVAL,
        'paid',
        ${paidAmount},
        NOW(),
        NOW()
      WHERE NOT EXISTS (SELECT 1 FROM existing_payment)
        AND NOT EXISTS (SELECT 1 FROM latest_sub)
      RETURNING id
    ),
    chosen_sub AS MATERIALIZED (
      SELECT id FROM updated_sub
      UNION ALL
      SELECT id FROM inserted_sub
    ),
    updated_member AS (
      UPDATE members m
      SET status = 'active', updated_at = NOW()
      WHERE m.id = ${memberId}
        AND m.gym_id = ${tenantId}
        AND EXISTS (SELECT 1 FROM chosen_sub)
      RETURNING m.id
    )
    INSERT INTO payments (
      member_id,
      subscription_id,
      amount,
      payment_method,
      transaction_id,
      status,
      payment_date,
      created_at
    )
    SELECT
      ${memberId},
      cs.id,
      ${paidAmount},
      'mercadopago',
      ${paymentId},
      'completed',
      NOW(),
      NOW()
    FROM chosen_sub cs
    CROSS JOIN updated_member
    ON CONFLICT (transaction_id) WHERE transaction_id IS NOT NULL DO NOTHING
    RETURNING id, subscription_id
  `;

  const [afterSub] = await sql`
    SELECT id, member_id, start_date, end_date, updated_at
    FROM subscriptions
    WHERE member_id = ${memberId}
    ORDER BY id DESC
    LIMIT 1
  `;

  const [afterPaymentCount] = await sql`
    SELECT COUNT(*)::int AS count
    FROM payments
    WHERE transaction_id = ${paymentId}
  `;

  console.log("RESULTADO DE REPROCESO");
  console.log(applied);
  console.log("DESPUES");
  console.log({
    subscription: afterSub,
    paymentCount: Number(afterPaymentCount?.count || 0),
  });

  const unchanged =
    String(beforeSub?.start_date) === String(afterSub?.start_date) &&
    String(beforeSub?.end_date) === String(afterSub?.end_date) &&
    Number(beforePaymentCount?.count || 0) === Number(afterPaymentCount?.count || 0);

  console.log(
    unchanged && applied.length === 0
      ? "OK: pago duplicado ignorado sin extender la suscripcion."
      : "ERROR: el reproceso produjo un cambio inesperado."
  );

  if (!unchanged || applied.length !== 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Error en prueba de idempotencia:", error);
  process.exitCode = 1;
});
