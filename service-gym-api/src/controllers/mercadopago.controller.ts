import { Request, Response } from 'express';
import { sql } from '../db/neon';

export const connectMercadoPago = async (req: Request, res: Response) => {
  const { tenantId } = req.query;

  if (!tenantId) {
    return res.status(400).json({ error: 'El parámetro tenantId es obligatorio' });
  }

  const clientId = process.env.MP_CLIENT_ID;
  const publicUrl = process.env.PUBLIC_URL?.replace(/\/$/, '');

  if (!clientId || !publicUrl) {
    return res.status(500).json({
      error: 'Configuración incompleta: MP_CLIENT_ID o PUBLIC_URL no están definidos en el entorno.',
    });
  }

  const redirectUri = `${publicUrl}/api/auth/mercadopago/callback`;

  res.setHeader('ngrok-skip-browser-warning', 'true');

  const mpAuthUrl = `https://auth.mercadopago.com/authorization?client_id=${clientId}&response_type=code&platform_id=mp&state=${tenantId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}`;

  return res.redirect(mpAuthUrl);
};

// 2. Callback OAuth de Mercado Pago para guardar credenciales por tenant
export const mercadoPagoCallback = async (req: Request, res: Response) => {
  const { code, state: tenantId, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '');

  if (!frontendUrl) {
    return res.status(500).json({ error: 'FRONTEND_URL no está configurada en el entorno.' });
  }

  if (error || !code) {
    return res.redirect(`${frontendUrl}/admin/pagos?status=error&message=access_denied`);
  }

  if (!tenantId) {
    return res.status(400).json({ error: 'tenantId no especificado en el parámetro state' });
  }

  try {
    const publicUrl = process.env.PUBLIC_URL?.replace(/\/$/, '');
    const clientId = process.env.MP_CLIENT_ID;
    const clientSecret = process.env.MP_CLIENT_SECRET;

    if (!publicUrl || !clientId || !clientSecret) {
      return res.status(500).json({ error: 'Configuración de servidor incompleta para OAuth.' });
    }

    const redirectUri = `${publicUrl}/api/auth/mercadopago/callback`;

    const response = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        client_secret: clientSecret,
        client_id: clientId,
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error al intercambiar token en Mercado Pago:', data);
      return res.redirect(`${frontendUrl}/admin/pagos?status=error`);
    }

    const { access_token, refresh_token, public_key, user_id, expires_in } = data;
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

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
        ${String(tenantId)},
        'mercadopago',
        ${access_token},
        ${refresh_token},
        ${public_key},
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
        updated_at = NOW();
    `;

    return res.redirect(`${frontendUrl}/admin/pagos?status=success`);
  } catch (err) {
    console.error('Error en el flujo OAuth de Mercado Pago:', err);
    return res.redirect(`${frontendUrl}/admin/pagos?status=error`);
  }
};

// 3. Crear Preferencia de Pago dinámicamente
export const createPreference = async (req: Request, res: Response) => {
  try {
    const { memberId, planId, tenantId, price } = req.body;

    if (!memberId) {
      return res.status(400).json({ error: 'El memberId es obligatorio.' });
    }

    // 1. Obtención de datos reales del socio desde la BD
    const memberResult = await sql`
      SELECT 
        m.id AS member_id,
        m.first_name,
        m.last_name,
        m.gym_id,
        COALESCE(m.email, u.email) AS email
      FROM members m
      LEFT JOIN users u ON u.id = m.user_id
      WHERE m.id = ${Number(memberId)} OR m.user_id = ${Number(memberId)}
      LIMIT 1
    `;

    const memberRows = Array.isArray(memberResult) ? memberResult : (memberResult as any).rows || [];
    const member = memberRows[0];

    if (!member) {
      return res.status(404).json({ error: 'No se encontró el socio especificado en la base de datos.' });
    }

    if (!member.email) {
      return res.status(400).json({ error: 'El socio no tiene un correo electrónico registrado en la base de datos.' });
    }

    // 2. Obtención dinámica del Plan desde la BD
    let plan = null;

    if (planId) {
      const planResult = await sql`
        SELECT id, name, price 
        FROM membership_plans 
        WHERE id = ${Number(planId)} 
        LIMIT 1
      `;
      const planRows = Array.isArray(planResult) ? planResult : (planResult as any).rows || [];
      plan = planRows[0];
    }

    if (!plan) {
      const activePlanResult = await sql`
        SELECT p.id, p.name, p.price 
        FROM subscriptions s
        JOIN membership_plans p ON p.id = s.plan_id
        WHERE s.member_id = ${member.member_id}
        ORDER BY s.created_at DESC
        LIMIT 1
      `;
      const activePlanRows = Array.isArray(activePlanResult) ? activePlanResult : (activePlanResult as any).rows || [];
      plan = activePlanRows[0];
    }

    if (!plan) {
      const defaultPlanResult = await sql`
        SELECT id, name, price 
        FROM membership_plans 
        WHERE is_active = true ${member.gym_id ? sql`AND gym_id = ${member.gym_id}` : sql``}
        ORDER BY id ASC 
        LIMIT 1
      `;
      const defaultPlanRows = Array.isArray(defaultPlanResult) ? defaultPlanResult : (defaultPlanResult as any).rows || [];
      plan = defaultPlanRows[0];
    }

    if (!plan) {
      return res.status(404).json({ error: 'No se encontró un plan de membresía válido para este socio o gimnasio.' });
    }

    // 3. Determinación de precio dinámico
    let unitPrice = Number(price) > 0 ? Number(price) : Number(plan.price);
    if (unitPrice < 1000) {
      unitPrice = unitPrice * 1000; // Ajuste en caso de montos sin mil
    }

    // 4. Obtención del token del gimnasio desde tenant_payment_configs
    const tenantIdParam = String(tenantId || member.gym_id || '');

    const tenantConfigRes = await sql`
      SELECT access_token 
      FROM tenant_payment_configs 
      WHERE tenant_id = ${tenantIdParam} AND provider = 'mercadopago'
      LIMIT 1
    `;
    const tenantConfigRows = Array.isArray(tenantConfigRes) ? tenantConfigRes : (tenantConfigRes as any)?.rows || [];
    const tenantAccessToken = tenantConfigRows[0]?.access_token || process.env.MP_ACCESS_TOKEN;

    if (!tenantAccessToken) {
      return res.status(400).json({
        error: 'El gimnasio especificado no tiene configuradas sus credenciales de Mercado Pago.',
      });
    }

    // 5. Configuración de URLs desde .env
    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '');
    const publicUrl = process.env.PUBLIC_URL?.replace(/\/$/, '');

    if (!frontendUrl || !publicUrl) {
      return res.status(500).json({
        error: 'Configuración de servidor incompleta: FRONTEND_URL y PUBLIC_URL deben estar definidas.',
      });
    }

    const returnUrl = `${frontendUrl}/miembro/membresia`;
    const webhookUrl = `${publicUrl}/api/payments/webhook`;

    // 6. Solicitud a Mercado Pago
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tenantAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            id: String(plan.id),
            title: plan.name,
            quantity: 1,
            unit_price: unitPrice,
            currency_id: 'ARS',
          },
        ],
        payer: {
          email: member.email,
          name: member.first_name || '',
          surname: member.last_name || '',
        },
        external_reference: JSON.stringify({
          tenantId: tenantIdParam,
          memberId: member.member_id,
          planId: plan.id,
        }),
        notification_url: webhookUrl,
        back_urls: {
          success: returnUrl,
          failure: returnUrl,
          pending: returnUrl,
        },
        auto_return: 'approved',
      }),
    });

    const preference = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('[MP PREFERENCE ERROR]:', preference);
      return res.status(500).json({ error: 'Error al comunicarse con Mercado Pago', details: preference });
    }

    return res.status(200).json({
      id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
    });
  } catch (error: any) {
    console.error('[MP PREFERENCE EXCEPTION]:', error);
    return res.status(500).json({ error: error?.message || 'Error interno del servidor' });
  }
};

// 4. Webhook para recibir notificaciones de pago
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const { type, data, action } = req.body;

    if ((type === 'payment' || action?.startsWith('payment.')) && data?.id) {
      const paymentId = data.id;
      console.log(`[MP WEBHOOK] Notificación recibida para el pago ID: ${paymentId}`);

      const accessToken = process.env.MP_ACCESS_TOKEN;

      if (!accessToken) {
        console.error('[MP WEBHOOK ERROR] No se encontró MP_ACCESS_TOKEN en process.env');
        return res.status(200).send('OK');
      }

      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!mpRes.ok) {
        console.error(`[MP WEBHOOK ERROR] No se pudo obtener la información del pago ${paymentId}`);
        return res.status(200).send('OK');
      }

      const paymentData = await mpRes.json();

      if (paymentData.status === 'approved') {
        const transactionAmount = paymentData.transaction_amount;

        let externalRef: { tenantId?: string; memberId?: string | number; planId?: string | number } = {};
        try {
          externalRef = JSON.parse(paymentData.external_reference || '{}');
        } catch (e) {
          console.warn('[MP WEBHOOK WARN] No se pudo parsear el external_reference JSON');
        }

        const { tenantId = 'gym-demo-1', memberId } = externalRef;

        console.log(`[MP WEBHOOK APROBADO] Pago de $${transactionAmount} para Tenant: ${tenantId}, Miembro: ${memberId}`);

        if (memberId) {
          const numMemberId = Number(memberId);
          const planId = externalRef?.planId ? Number(externalRef.planId) : null;

          const memberFind = await sql`
            SELECT id FROM members 
            WHERE id = ${numMemberId} OR user_id = ${numMemberId} 
            LIMIT 1
          `;
          const realMemberRows = Array.isArray(memberFind) ? memberFind : (memberFind as any)?.rows || [];
          const realMemberId = realMemberRows[0]?.id || numMemberId;

          await sql`
            UPDATE members 
            SET status = 'active', updated_at = NOW()
            WHERE id = ${realMemberId};
          `;

          const existingSub = await sql`
            SELECT id FROM subscriptions WHERE member_id = ${realMemberId} ORDER BY id DESC LIMIT 1
          `;
          const subRows = Array.isArray(existingSub) ? existingSub : (existingSub as any)?.rows || [];

          let subscriptionId: number | null = null;

          if (subRows.length > 0) {
            subscriptionId = subRows[0].id;

            if (planId) {
              await sql`
                UPDATE subscriptions
                SET 
                  status = 'active',
                  plan_id = ${planId},
                  start_date = CURRENT_DATE,
                  end_date = CURRENT_DATE + INTERVAL '30 days',
                  updated_at = NOW()
                WHERE id = ${subscriptionId};
              `;
            } else {
              await sql`
                UPDATE subscriptions
                SET 
                  status = 'active',
                  start_date = CURRENT_DATE,
                  end_date = CURRENT_DATE + INTERVAL '30 days',
                  updated_at = NOW()
                WHERE id = ${subscriptionId};
              `;
            }
          } else {
            let finalPlanId = planId;

            if (!finalPlanId) {
              const defaultPlan = await sql`
                SELECT id FROM membership_plans WHERE is_active = true ORDER BY id ASC LIMIT 1
              `;
              const defaultPlanRows = Array.isArray(defaultPlan) ? defaultPlan : (defaultPlan as any)?.rows || [];
              finalPlanId = defaultPlanRows[0]?.id || 1;
            }

            const newSub = await sql`
              INSERT INTO subscriptions (
                member_id,
                plan_id,
                status,
                start_date,
                end_date,
                created_at,
                updated_at
              ) VALUES (
                ${realMemberId},
                ${finalPlanId},
                'active',
                CURRENT_DATE,
                CURRENT_DATE + INTERVAL '30 days',
                NOW(),
                NOW()
              )
              RETURNING id;
            `;
            const newSubRows = Array.isArray(newSub) ? newSub : (newSub as any)?.rows || [];
            subscriptionId = newSubRows[0]?.id || null;
          }

          await sql`
            INSERT INTO payments (
              member_id,
              subscription_id,
              amount,
              payment_method,
              transaction_id,
              status,
              created_at
            ) VALUES (
              ${realMemberId},
              ${subscriptionId},
              ${transactionAmount},
              'mercadopago',
              ${String(paymentId)},
              'completed',
              NOW()
            );
          `;

          console.log(`[MP WEBHOOK ÉXITO] Miembro #${realMemberId} activado correctamente con suscripción #${subscriptionId}.`);
        }
      }
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('[MP WEBHOOK EXCEPTION]:', error);
    return res.status(200).send('OK');
  }
};