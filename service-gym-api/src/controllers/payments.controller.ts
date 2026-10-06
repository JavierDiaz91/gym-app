import { Request, Response } from "express";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { sql } from "../db/neon";

/**
 * Genera la preferencia de pago dinámica usando el Access Token del Tenant
 */
export const createPreference = async (req: Request, res: Response) => {
  try {
    const { tenantId = "gym-demo-1", memberId, planId, planName, price } = req.body;

    if (!memberId || !planId || !price) {
      return res.status(400).json({ error: "Faltan datos obligatorios (memberId, planId, price)" });
    }

    // 1. Obtener Access Token de Neon DB
    const tenantConfigs = await sql`
      SELECT access_token 
      FROM tenant_payment_configs 
      WHERE tenant_id = ${tenantId} AND provider = 'mercadopago'
      LIMIT 1
    `;

    if (!tenantConfigs || tenantConfigs.length === 0 || !tenantConfigs[0].access_token) {
      return res.status(400).json({
        error: "El gimnasio no tiene una cuenta de Mercado Pago vinculada.",
      });
    }

    const tenantAccessToken = tenantConfigs[0].access_token;
    const client = new MercadoPagoConfig({ accessToken: tenantAccessToken });
    const preference = new Preference(client);

    // Usamos ngrok / URL pública porque MP rechaza redirecciones automáticas a http://localhost[cite: 10]
    const publicUrl = process.env.NEXT_PUBLIC_APP_URL || "https://uncensorable-dramatically-pat.ngrok-free.dev";

    const result = await preference.create({
      body: {
        items: [
          {
            id: String(planId),
            title: `Cuota Gimnasio - ${planName || "Membresía"}`,
            quantity: 1,
            unit_price: Number(price),
            currency_id: "ARS",
          },
        ],
        external_reference: JSON.stringify({
          tenant_id: tenantId,
          member_id: Number(memberId),
          plan_id: Number(planId),
        }),
        notification_url: `${publicUrl}/api/payments/webhook?tenantId=${tenantId}`,
        back_urls: {
          success: `${publicUrl}/admin/pagos?payment=success`,
          failure: `${publicUrl}/admin/pagos?payment=failed`,
          pending: `${publicUrl}/admin/pagos?payment=pending`,
        },
        //auto_return: "approved",
      },
    });

    return res.json({ 
      init_point: result.init_point, 
      sandbox_init_point: result.sandbox_init_point 
    });
  } catch (error: any) {
    console.error("Error al crear preferencia de Mercado Pago:", error.response?.data || error.message || error);
    return res.status(500).json({ error: "Error al generar la orden de pago" });
  }
};

/**
 * Escucha las notificaciones de Mercado Pago (Webhook) y procesa el pago del socio
 */
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const topic = req.query.topic || req.query.type || req.body?.type;
    const paymentId = req.query.id || req.query["data.id"] || req.body?.data?.id;
    const tenantIdParam = (req.query.tenantId as string) || "gym-demo-1";

    if (topic === "payment" && paymentId) {
      // 1. Obtener el Access Token del tenant
      const tenantConfigs = await sql`
        SELECT access_token 
        FROM tenant_payment_configs 
        WHERE tenant_id = ${tenantIdParam} AND provider = 'mercadopago'
        LIMIT 1
      `;

      if (!tenantConfigs || tenantConfigs.length === 0) {
        console.error(`Webhook error: No se encontraron credenciales para tenant ${tenantIdParam}`);
        return res.status(200).send("OK");
      }

      const client = new MercadoPagoConfig({ accessToken: tenantConfigs[0].access_token });
      const paymentClient = new Payment(client);
      const paymentData = await paymentClient.get({ id: String(paymentId) });

      if (paymentData.status === "approved") {
        const { member_id, plan_id, tenant_id } = JSON.parse(paymentData.external_reference || "{}");

        if (member_id && plan_id) {
          // A. Reactivar al socio
          await sql`
            UPDATE members 
            SET status = 'active' 
            WHERE id = ${member_id}
          `;

          // B. Verificar suscripción existente
          const existingSub = await sql`
            SELECT id FROM subscriptions WHERE member_id = ${member_id} LIMIT 1
          `;

          let subscriptionId: number;

          if (existingSub && existingSub.length > 0) {
            subscriptionId = existingSub[0].id;
            // Renovar por 30 días
            await sql`
              UPDATE subscriptions 
              SET plan_id = ${plan_id}, 
                  start_date = NOW(), 
                  end_date = NOW() + INTERVAL '30 days', 
                  status = 'active' 
              WHERE id = ${subscriptionId}
            `;
          } else {
            // Crear nueva suscripción
            const newSub = await sql`
              INSERT INTO subscriptions (member_id, plan_id, start_date, end_date, status)
              VALUES (${member_id}, ${plan_id}, NOW(), NOW() + INTERVAL '30 days', 'active')
              RETURNING id
            `;
            subscriptionId = newSub[0].id;
          }

          // C. Registrar el cobro en la tabla payments
          await sql`
            INSERT INTO payments (member_id, subscription_id, amount, payment_method, transaction_id, status, notes, payment_date)
            VALUES (${member_id}, ${subscriptionId}, ${paymentData.transaction_amount}, 'mercadopago', ${String(paymentData.id)}, 'completed', 'Pago online automatizado vía Mercado Pago', NOW())
          `;

          console.log(`✅ Socio ID ${member_id} activado exitosamente por pago en línea (Tenant: ${tenant_id || tenantIdParam}).`);
        }
      }
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("Error procesando Webhook de Mercado Pago:", error);
    return res.status(500).json({ error: "Error en el servidor al procesar el webhook" });
  }
};