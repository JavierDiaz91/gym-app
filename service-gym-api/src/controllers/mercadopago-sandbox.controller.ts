import { Request, Response } from "express";
import { sql } from "../db/neon";

function getTestAccessToken(): string | null {
  const token = String(process.env.MP_TEST_ACCESS_TOKEN || "").trim();
  return token || null;
}

function getTestSellerUserId(): string | null {
  const userId = String(process.env.MP_TEST_SELLER_USER_ID || "").trim();
  return userId || null;
}

function getTestTenantId(): string | null {
  const tenantId = String(process.env.MP_TEST_TENANT_ID || "").trim();
  return tenantId || null;
}

export const reconcileSandboxPayment = async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(404).json({ error: "Not found" });
    }

    if (process.env.MP_USE_TEST_CREDENTIALS !== "true") {
      return res.status(403).json({ error: "Sandbox de Mercado Pago deshabilitado." });
    }

    const paymentId = String(req.body?.paymentId || req.query.paymentId || "").trim();
    const accessToken = getTestAccessToken();
    const sellerUserId = getTestSellerUserId();
    const tenantId = getTestTenantId();

    if (!paymentId) {
      return res.status(400).json({ error: "paymentId es obligatorio." });
    }

    if (!accessToken || !sellerUserId || !tenantId) {
      return res.status(500).json({
        error: "Faltan MP_TEST_ACCESS_TOKEN, MP_TEST_SELLER_USER_ID o MP_TEST_TENANT_ID.",
      });
    }

    const mpRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!mpRes.ok) {
      return res.status(400).json({
        error: "No se pudo consultar el pago sandbox en Mercado Pago.",
      });
    }

    const paymentData = await mpRes.json();

    const paymentSellerUserId = String(
      paymentData.collector_id ?? paymentData.user_id ?? ""
    ).trim();

    if (paymentSellerUserId !== sellerUserId) {
      return res.status(403).json({
        error: "El pago no pertenece al vendedor sandbox configurado.",
      });
    }

    if (paymentData.status !== "approved") {
      return res.status(409).json({
        error: "El pago sandbox todavía no está aprobado.",
        status: paymentData.status,
      });
    }

    let externalRef: {
      tenantId?: string | number;
      memberId?: string | number;
      planId?: string | number;
    };

    try {
      externalRef = JSON.parse(paymentData.external_reference || "{}");
    } catch {
      return res.status(400).json({ error: "external_reference inválido." });
    }

    const refTenantId = Number(externalRef.tenantId);
    const memberId = Number(externalRef.memberId);
    const planId = Number(externalRef.planId);

    if (
      !Number.isFinite(refTenantId) ||
      !Number.isFinite(memberId) ||
      !Number.isFinite(planId) ||
      String(refTenantId) !== tenantId
    ) {
      return res.status(400).json({
        error: "La referencia del pago no coincide con el tenant sandbox configurado.",
      });
    }

    const [member] = await sql`
      SELECT id, gym_id
      FROM members
      WHERE id = ${memberId}
        AND gym_id = ${refTenantId}
      LIMIT 1
    `;

    if (!member) {
      return res.status(404).json({ error: "Miembro inválido para este tenant." });
    }

    const [plan] = await sql`
      SELECT id, price, duration_months
      FROM membership_plans
      WHERE id = ${planId}
        AND gym_id = ${refTenantId}
      LIMIT 1
    `;

    if (!plan) {
      return res.status(404).json({ error: "Plan inválido para este tenant." });
    }

    const expectedAmount = Number(plan.price);
    const paidAmount = Number(paymentData.transaction_amount);

    if (
      !Number.isFinite(expectedAmount) ||
      !Number.isFinite(paidAmount) ||
      Math.abs(expectedAmount - paidAmount) > 0.01
    ) {
      return res.status(400).json({
        error: "El importe pagado no coincide con el plan.",
      });
    }

    const existingPayment = await sql`
      SELECT id
      FROM payments
      WHERE transaction_id = ${paymentId}
      LIMIT 1
    `;

    if (existingPayment.length > 0) {
      return res.status(200).json({
        ok: true,
        duplicate: true,
        paymentId,
        memberId,
        tenantId: refTenantId,
      });
    }

    const existingSub = await sql`
      SELECT id
      FROM subscriptions
      WHERE member_id = ${memberId}
      ORDER BY id DESC
      LIMIT 1
    `;

    const durationMonths = Math.max(1, Number(plan.duration_months) || 1);
    let subscriptionId: number | null = null;

    if (existingSub.length > 0) {
      subscriptionId = Number(existingSub[0].id);

      await sql`
        UPDATE subscriptions
        SET
          status = 'active',
          plan_id = ${planId},
          start_date = CURRENT_DATE,
          end_date = CURRENT_DATE + (${durationMonths} || ' month')::INTERVAL,
          payment_status = 'paid',
          amount_paid = ${paidAmount},
          updated_at = NOW()
        WHERE id = ${subscriptionId}
          AND member_id = ${memberId}
      `;
    } else {
      const newSub = await sql`
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
        VALUES (
          ${memberId},
          ${planId},
          'active',
          CURRENT_DATE,
          CURRENT_DATE + (${durationMonths} || ' month')::INTERVAL,
          'paid',
          ${paidAmount},
          NOW(),
          NOW()
        )
        RETURNING id
      `;

      subscriptionId = Number(newSub[0]?.id || 0) || null;
    }

    await sql`
      UPDATE members
      SET status = 'active', updated_at = NOW()
      WHERE id = ${memberId}
        AND gym_id = ${refTenantId}
    `;

    await sql`
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
      VALUES (
        ${memberId},
        ${subscriptionId},
        ${paidAmount},
        'mercadopago',
        ${paymentId},
        'completed',
        NOW(),
        NOW()
      )
    `;

    console.log(
      `[MP SANDBOX] Pago ${paymentId} conciliado para miembro ${memberId} tenant ${refTenantId}.`
    );

    return res.status(200).json({
      ok: true,
      duplicate: false,
      paymentId,
      memberId,
      tenantId: refTenantId,
      subscriptionId,
      amount: paidAmount,
    });
  } catch (error) {
    console.error("[MP SANDBOX RECONCILE]:", error);
    return res.status(500).json({ error: "Error interno conciliando pago sandbox." });
  }
};
