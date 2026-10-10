import { createHmac, timingSafeEqual } from "crypto";
import { Request, Response } from "express";
import {
  InvalidWebhookSignatureError,
  WebhookSignatureValidator,
} from "mercadopago";
import { sql } from "../db/neon";
import { AuthenticatedRequest, getRequestGymId } from "../middlewares/auth";

const OAUTH_STATE_TTL_SECONDS = 10 * 60;


function useTestCredentialsForTenant(tenantId: string): boolean {
  return (
    process.env.MP_USE_TEST_CREDENTIALS === "true" &&
    String(process.env.MP_TEST_TENANT_ID || "").trim() === String(tenantId)
  );
}

function getTestAccessToken(): string | null {
  const token = String(process.env.MP_TEST_ACCESS_TOKEN || "").trim();
  return token || null;
}

function getTestSellerUserId(): string | null {
  const userId = String(process.env.MP_TEST_SELLER_USER_ID || "").trim();
  return userId || null;
}

function getWebhookSecret(): string {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("MP_WEBHOOK_SECRET debe estar configurado.");
  }
  return secret;
}

function parseWebhookSignature(value: string): { ts: string; v1: string } | null {
  const parts = value.split(",");
  let ts = "";
  let v1 = "";

  for (const part of parts) {
    const [rawKey, ...rawValueParts] = part.split("=");
    const key = rawKey?.trim();
    const parsedValue = rawValueParts.join("=").trim();

    if (key === "ts") ts = parsedValue;
    if (key === "v1") v1 = parsedValue;
  }

  if (!ts || !v1) return null;
  return { ts, v1 };
}

function verifyWebhookSignature(req: Request): boolean {
  const xSignature = String(req.header("x-signature") || "").trim();
  const xRequestId = String(req.header("x-request-id") || "").trim();
  const rawDataId = req.query["data.id"];
  const dataId = Array.isArray(rawDataId)
    ? String(rawDataId[rawDataId.length - 1] || "")
    : String(rawDataId || "");

  if (!xSignature || !xRequestId) return false;

  try {
    WebhookSignatureValidator.validate({
      xSignature,
      xRequestId,
      dataId,
      secret: getWebhookSecret(),
    });
    return true;
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      return false;
    }
    throw error;
  }
}

function getOAuthStateSecret() {
  const secret = process.env.MP_OAUTH_STATE_SECRET || process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "MP_OAUTH_STATE_SECRET o SESSION_SECRET debe tener al menos 32 caracteres."
    );
  }
  return secret;
}

function signOAuthState(gymId: number) {
  const payload = Buffer.from(
    JSON.stringify({
      gymId,
      exp: Math.floor(Date.now() / 1000) + OAUTH_STATE_TTL_SECONDS,
    }),
    "utf8"
  ).toString("base64url");

  const signature = createHmac("sha256", getOAuthStateSecret())
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

function verifyOAuthState(state: string): { gymId: number } | null {
  try {
    const [payload, signature, ...rest] = state.split(".");
    if (!payload || !signature || rest.length > 0) return null;

    const expected = createHmac("sha256", getOAuthStateSecret())
      .update(payload)
      .digest();

    const received = Buffer.from(signature, "base64url");
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      return null;
    }

    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    if (
      !Number.isFinite(Number(decoded.gymId)) ||
      Number(decoded.gymId) <= 0 ||
      !Number.isFinite(Number(decoded.exp)) ||
      Number(decoded.exp) <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return { gymId: Number(decoded.gymId) };
  } catch {
    return null;
  }
}

export const connectMercadoPago = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.auth) {
      return res.status(401).json({ error: "Autenticación requerida." });
    }

    const gymId = getRequestGymId(req, req.query.tenantId);
    if (!gymId) {
      return res.status(400).json({ error: "Gimnasio inválido." });
    }

    const clientId = process.env.MP_CLIENT_ID;
    const publicUrl = process.env.PUBLIC_URL?.replace(/\/$/, "");

    if (!clientId || !publicUrl) {
      return res.status(500).json({
        error:
          "Configuración incompleta: MP_CLIENT_ID o PUBLIC_URL no están definidos.",
      });
    }

    const redirectUri = `${publicUrl}/api/mercadopago/callback`;
    const state = signOAuthState(gymId);

    res.setHeader("ngrok-skip-browser-warning", "true");

    const mpAuthUrl =
      "https://auth.mercadopago.com/authorization" +
      `?client_id=${encodeURIComponent(clientId)}` +
      "&response_type=code&platform_id=mp" +
      `&state=${encodeURIComponent(state)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}`;

    return res.redirect(mpAuthUrl);
  } catch (error) {
    console.error("Error iniciando OAuth de Mercado Pago:", error);
    return res.status(500).json({ error: "No se pudo iniciar la vinculación." });
  }
};

export const mercadoPagoCallback = async (req: Request, res: Response) => {
  const { code, state, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, "");

  if (!frontendUrl) {
    return res.status(500).json({
      error: "FRONTEND_URL no está configurada en el entorno.",
    });
  }

  if (error || !code || !state) {
    return res.redirect(
      `${frontendUrl}/admin/pagos?status=error&message=access_denied`
    );
  }

  const stateData = verifyOAuthState(String(state));
  if (!stateData) {
    return res.redirect(
      `${frontendUrl}/admin/pagos?status=error&message=invalid_state`
    );
  }

  try {
    const publicUrl = process.env.PUBLIC_URL?.replace(/\/$/, "");
    const clientId = process.env.MP_CLIENT_ID;
    const clientSecret = process.env.MP_CLIENT_SECRET;

    if (!publicUrl || !clientId || !clientSecret) {
      return res.status(500).json({
        error: "Configuración de servidor incompleta para OAuth.",
      });
    }

    const redirectUri = `${publicUrl}/api/mercadopago/callback`;

    const response = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        client_secret: clientSecret,
        client_id: clientId,
        grant_type: "authorization_code",
        code: String(code),
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error al intercambiar token en Mercado Pago:", data);
      return res.redirect(`${frontendUrl}/admin/pagos?status=error`);
    }

    const { access_token, refresh_token, public_key, user_id, expires_in } = data;

    if (!access_token || !user_id) {
      return res.redirect(
        `${frontendUrl}/admin/pagos?status=error&message=invalid_token_response`
      );
    }

    const tokenExpiresAt = new Date(
      Date.now() + Number(expires_in || 0) * 1000
    );

    await sql`
      INSERT INTO tenant_payment_configs (
        tenant_id,
        provider,
        access_token,
        refresh_token,
        public_key,
        mp_user_id,
        token_expires_at,
        updated_at
      )
      VALUES (
        ${String(stateData.gymId)},
        'mercadopago',
        ${access_token},
        ${refresh_token || null},
        ${public_key || null},
        ${String(user_id)},
        ${tokenExpiresAt.toISOString()},
        NOW()
      )
      ON CONFLICT (tenant_id)
      DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        public_key = EXCLUDED.public_key,
        mp_user_id = EXCLUDED.mp_user_id,
        token_expires_at = EXCLUDED.token_expires_at,
        updated_at = NOW()
    `;

    return res.redirect(`${frontendUrl}/admin/pagos?status=success`);
  } catch (err) {
    console.error("Error en el flujo OAuth de Mercado Pago:", err);
    return res.redirect(`${frontendUrl}/admin/pagos?status=error`);
  }
};

// 3. Crear Preferencia de Pago dinámicamente
export const createPreference = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { memberId, planId } = req.body;

    if (!req.auth) {
      return res.status(401).json({ error: "Autenticación requerida." });
    }

    if (!memberId) {
      return res.status(400).json({ error: "El memberId es obligatorio." });
    }

    const requestedMemberId = Number(memberId);

    const memberResult =
      req.auth.role === "superadmin"
        ? await sql`
            SELECT
              m.id AS member_id,
              m.first_name,
              m.last_name,
              m.gym_id,
              m.user_id,
              COALESCE(m.email, u.email) AS email
            FROM members m
            LEFT JOIN users u ON u.id = m.user_id
            WHERE m.id = ${requestedMemberId}
               OR m.user_id = ${requestedMemberId}
            LIMIT 1
          `
        : req.auth.role === "member"
        ? await sql`
            SELECT
              m.id AS member_id,
              m.first_name,
              m.last_name,
              m.gym_id,
              m.user_id,
              COALESCE(m.email, u.email) AS email
            FROM members m
            LEFT JOIN users u ON u.id = m.user_id
            WHERE m.user_id = ${req.auth.userId}
              AND m.gym_id = ${req.auth.gymId}
            LIMIT 1
          `
        : await sql`
            SELECT
              m.id AS member_id,
              m.first_name,
              m.last_name,
              m.gym_id,
              m.user_id,
              COALESCE(m.email, u.email) AS email
            FROM members m
            LEFT JOIN users u ON u.id = m.user_id
            WHERE (m.id = ${requestedMemberId} OR m.user_id = ${requestedMemberId})
              AND m.gym_id = ${req.auth.gymId}
            LIMIT 1
          `;

    const memberRows = Array.isArray(memberResult)
      ? memberResult
      : (memberResult as any).rows || [];
    const member = memberRows[0];

    if (!member) {
      return res.status(404).json({
        error: "No se encontró el socio especificado.",
      });
    }

    if (!member.email) {
      return res.status(400).json({
        error: "El socio no tiene un correo electrónico registrado.",
      });
    }

    let plan = null;

    if (planId) {
      const planResult = await sql`
        SELECT id, name, price
        FROM membership_plans
        WHERE id = ${Number(planId)}
          AND gym_id = ${Number(member.gym_id)}
          AND is_active = true
        LIMIT 1
      `;

      const planRows = Array.isArray(planResult)
        ? planResult
        : (planResult as any).rows || [];
      plan = planRows[0];
    }

    if (!plan) {
      const activePlanResult = await sql`
        SELECT p.id, p.name, p.price
        FROM subscriptions s
        JOIN membership_plans p ON p.id = s.plan_id
        WHERE s.member_id = ${member.member_id}
          AND p.gym_id = ${Number(member.gym_id)}
        ORDER BY s.created_at DESC
        LIMIT 1
      `;

      const activePlanRows = Array.isArray(activePlanResult)
        ? activePlanResult
        : (activePlanResult as any).rows || [];
      plan = activePlanRows[0];
    }

    if (!plan) {
      return res.status(404).json({
        error: "No se encontró un plan válido para este socio.",
      });
    }

    const unitPrice = Number(plan.price);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return res.status(500).json({
        error: "El plan tiene un precio inválido.",
      });
    }

    const tenantIdParam = String(member.gym_id);

    const tenantConfigRes = await sql`
      SELECT access_token
      FROM tenant_payment_configs
      WHERE tenant_id = ${tenantIdParam}
        AND provider = 'mercadopago'
      LIMIT 1
    `;

    const tenantConfigRows = Array.isArray(tenantConfigRes)
      ? tenantConfigRes
      : (tenantConfigRes as any)?.rows || [];

    const useTestCredentials = useTestCredentialsForTenant(tenantIdParam);
    const tenantAccessToken = useTestCredentials
      ? getTestAccessToken()
      : tenantConfigRows[0]?.access_token;

    if (!tenantAccessToken) {
      return res.status(400).json({
        error: useTestCredentials
          ? "MP_TEST_ACCESS_TOKEN no está configurado para el entorno de prueba."
          : "El gimnasio no tiene configuradas sus credenciales de Mercado Pago.",
      });
    }

    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, "");
    const publicUrl = process.env.PUBLIC_URL?.replace(/\/$/, "");

    if (!frontendUrl || !publicUrl) {
      return res.status(500).json({
        error: "FRONTEND_URL y PUBLIC_URL deben estar definidas.",
      });
    }

    const returnTarget =
      req.auth.role === "admin" || req.auth.role === "superadmin"
        ? "admin"
        : "member";
    const webhookUrl = `${publicUrl}/api/payments/webhook`;
    const successUrl = `${publicUrl}/api/payments/return?status=success&target=${returnTarget}`;
    const failureUrl = `${publicUrl}/api/payments/return?status=failure&target=${returnTarget}`;
    const pendingUrl = `${publicUrl}/api/payments/return?status=pending&target=${returnTarget}`;

    const mpResponse = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tenantAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              id: String(plan.id),
              title: plan.name,
              quantity: 1,
              unit_price: unitPrice,
              currency_id: "ARS",
            },
          ],
          external_reference: JSON.stringify({
            tenantId: tenantIdParam,
            memberId: member.member_id,
            planId: plan.id,
          }),
          notification_url: webhookUrl,
          back_urls: {
            success: successUrl,
            failure: failureUrl,
            pending: pendingUrl,
          },
          auto_return: "approved",
        }),
      }
    );

    const preference = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("[MP PREFERENCE ERROR]:", preference);
      return res.status(500).json({
        error: "Error al comunicarse con Mercado Pago",
        details: preference,
      });
    }

    return res.status(200).json({
      id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
    });
  } catch (error: any) {
    console.error("[MP PREFERENCE EXCEPTION]:", error);
    return res.status(500).json({
      error: error?.message || "Error interno del servidor",
    });
  }
};

export const handlePaymentReturn = async (req: Request, res: Response) => {
  const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, "");

  if (!frontendUrl) {
    return res.status(500).json({
      error: "FRONTEND_URL no está configurada en el entorno.",
    });
  }

  const rawStatus = Array.isArray(req.query.status)
    ? String(req.query.status[req.query.status.length - 1] || "")
    : String(req.query.status || "");
  const rawCollectionStatus = Array.isArray(req.query.collection_status)
    ? String(
        req.query.collection_status[
          req.query.collection_status.length - 1
        ] || ""
      )
    : String(req.query.collection_status || "");

  const status = (rawCollectionStatus || rawStatus).toLowerCase();
  const target = String(req.query.target || "member").toLowerCase();

  const normalizedStatus =
    status === "approved" || status === "success"
      ? "success"
      : status === "pending" || status === "in_process"
      ? "pending"
      : status === "rejected" ||
        status === "cancelled" ||
        status === "failure"
      ? "failure"
      : "unknown";

  const destination =
    target === "admin"
      ? `${frontendUrl}/admin/pagos?payment=${encodeURIComponent(normalizedStatus)}`
      : `${frontendUrl}/miembro/membresia?payment=${encodeURIComponent(normalizedStatus)}`;

  return res.redirect(destination);
};

// 4. Webhook para recibir notificaciones de pago
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    if (!verifyWebhookSignature(req)) {
      const hasSignature = Boolean(req.header("x-signature"));
      const hasRequestId = Boolean(req.header("x-request-id"));
      const rawQueryDataId = req.query["data.id"];
      const queryDataId = Array.isArray(rawQueryDataId)
        ? String(rawQueryDataId[rawQueryDataId.length - 1] || "").trim()
        : String(rawQueryDataId || "").trim();
      const bodyDataId = String(req.body?.data?.id || "").trim();

      console.warn("[MP WEBHOOK] Firma inválida.", {
        hasSignature,
        hasRequestId,
        queryDataId,
        bodyDataId,
        dataIdsMatch: Boolean(queryDataId && bodyDataId && queryDataId === bodyDataId),
        queryDataIdKind: Array.isArray(rawQueryDataId)
          ? "array"
          : typeof rawQueryDataId,
        type: String(req.body?.type || req.query.type || ""),
        action: String(req.body?.action || ""),
        applicationId: String(req.body?.application_id || ""),
        liveMode:
          typeof req.body?.live_mode === "boolean" ? req.body.live_mode : null,
        userId: String(req.body?.user_id || req.query.user_id || ""),
      });

      return res.status(401).json({ error: "Firma de webhook inválida." });
    }

    const { type, data, action, user_id: bodyUserId } = req.body || {};

    if (
      !((type === "payment" || String(action || "").startsWith("payment.")) &&
        data?.id)
    ) {
      return res.status(200).send("OK");
    }

    const paymentId = String(data.id);
    const notificationUserId = String(
      bodyUserId || req.query.user_id || ""
    ).trim();

    if (!notificationUserId) {
      console.warn(
        `[MP WEBHOOK] Pago ${paymentId} sin user_id; no se procesa por seguridad.`
      );
      return res.status(200).send("OK");
    }

    const testTenantId = String(process.env.MP_TEST_TENANT_ID || "").trim();
    const testSellerUserId = getTestSellerUserId();
    const useTestWebhookCredentials =
      process.env.MP_USE_TEST_CREDENTIALS === "true" &&
      !!testTenantId &&
      !!testSellerUserId &&
      notificationUserId === testSellerUserId;

    let config: {
      tenant_id: string;
      access_token: string;
      mp_user_id: string;
    } | null = null;

    if (useTestWebhookCredentials) {
      const testAccessToken = getTestAccessToken();
      if (!testAccessToken) {
        console.error("[MP WEBHOOK] MP_TEST_ACCESS_TOKEN no está configurado.");
        return res.status(500).send("ERROR");
      }

      config = {
        tenant_id: testTenantId,
        access_token: testAccessToken,
        mp_user_id: testSellerUserId,
      };
    } else {
      const configResult = await sql`
        SELECT tenant_id, access_token, mp_user_id
        FROM tenant_payment_configs
        WHERE provider = 'mercadopago'
          AND mp_user_id = ${notificationUserId}
        LIMIT 1
      `;

      const row = configResult[0] as
        | { tenant_id?: unknown; access_token?: unknown; mp_user_id?: unknown }
        | undefined;

      config = row
        ? {
            tenant_id: String(row.tenant_id ?? ""),
            access_token: String(row.access_token ?? ""),
            mp_user_id: String(row.mp_user_id ?? ""),
          }
        : null;
    }

    if (!config?.access_token) {
      console.warn(
        `[MP WEBHOOK] No existe configuración para mp_user_id=${notificationUserId}`
      );
      return res.status(200).send("OK");
    }

    const mpRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
      {
        headers: {
          Authorization: `Bearer ${config.access_token}`,
        },
      }
    );

    if (!mpRes.ok) {
      console.error(
        `[MP WEBHOOK] No se pudo consultar el pago ${paymentId} con el token del tenant.`
      );
      return res.status(200).send("OK");
    }

    const paymentData = await mpRes.json();

    if (String(paymentData.user_id || "") !== String(config.mp_user_id)) {
      console.warn(
        `[MP WEBHOOK] El pago ${paymentId} no pertenece a la cuenta configurada.`
      );
      return res.status(200).send("OK");
    }

    if (paymentData.status !== "approved") {
      return res.status(200).send("OK");
    }

    let externalRef: {
      tenantId?: string;
      memberId?: string | number;
      planId?: string | number;
    } = {};

    try {
      externalRef = JSON.parse(paymentData.external_reference || "{}");
    } catch {
      console.warn(
        `[MP WEBHOOK] external_reference inválido para pago ${paymentId}`
      );
      return res.status(200).send("OK");
    }

    const tenantId = Number(externalRef.tenantId);
    const memberId = Number(externalRef.memberId);
    const planId = Number(externalRef.planId);

    if (
      !Number.isFinite(tenantId) ||
      !Number.isFinite(memberId) ||
      !Number.isFinite(planId) ||
      String(tenantId) !== String(config.tenant_id)
    ) {
      console.warn(
        `[MP WEBHOOK] Referencia inconsistente para pago ${paymentId}`
      );
      return res.status(200).send("OK");
    }

    const [member] = await sql`
      SELECT id, gym_id
      FROM members
      WHERE id = ${memberId}
        AND gym_id = ${tenantId}
      LIMIT 1
    `;

    if (!member) {
      console.warn(
        `[MP WEBHOOK] Miembro ${memberId} no pertenece al tenant ${tenantId}`
      );
      return res.status(200).send("OK");
    }

    const [plan] = await sql`
      SELECT id, price, duration_months
      FROM membership_plans
      WHERE id = ${planId}
        AND gym_id = ${tenantId}
      LIMIT 1
    `;

    if (!plan) {
      console.warn(
        `[MP WEBHOOK] Plan ${planId} no pertenece al tenant ${tenantId}`
      );
      return res.status(200).send("OK");
    }

    const expectedAmount = Number(plan.price);
    const paidAmount = Number(paymentData.transaction_amount);

    if (
      !Number.isFinite(expectedAmount) ||
      !Number.isFinite(paidAmount) ||
      Math.abs(expectedAmount - paidAmount) > 0.01
    ) {
      console.warn(
        `[MP WEBHOOK] Importe inválido para pago ${paymentId}. Esperado=${expectedAmount} recibido=${paidAmount}`
      );
      return res.status(200).send("OK");
    }

    const existingPayment = await sql`
      SELECT id
      FROM payments
      WHERE transaction_id = ${paymentId}
        AND member_id = ${memberId}
      LIMIT 1
    `;

    if (existingPayment.length > 0) {
      return res.status(200).send("OK");
    }

    const existingSub = await sql`
      SELECT id
      FROM subscriptions
      WHERE member_id = ${memberId}
      ORDER BY id DESC
      LIMIT 1
    `;

    let subscriptionId: number | null = null;
    const durationMonths = Math.max(1, Number(plan.duration_months) || 1);

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
        AND gym_id = ${tenantId}
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
      `[MP WEBHOOK] Pago ${paymentId} aplicado al miembro ${memberId} del tenant ${tenantId}.`
    );

    return res.status(200).send("OK");
  } catch (error) {
    console.error("[MP WEBHOOK EXCEPTION]:", error);

    // Mercado Pago reintentará según su política. Respondemos 500 sólo ante
    // errores internos inesperados para no perder eventos transitorios.
    return res.status(500).send("ERROR");
  }
};
