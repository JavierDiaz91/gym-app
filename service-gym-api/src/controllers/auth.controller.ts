// service-gym-api/src/controllers/auth.controller.ts
import { Request, Response } from "express";
import { sql } from "../db/neon";
import bcrypt from "bcryptjs";
import axios from "axios";

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    // Buscar usuario y el estado de su gimnasio asociado
    const result = await sql`
      SELECT u.*, g.status AS gym_status
      FROM users u
      LEFT JOIN gyms g ON u.gym_id = g.id
      WHERE u.email = ${email}
    `;

    const user = result[0];

    if (!user) {
      return res.status(401).json({ success: false, error: "Credenciales inválidas" });
    }

    // Validar contraseña...
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ success: false, error: "Credenciales inválidas" });
    }

    // BLOQUEO CLAVE: Si no es SuperAdmin y el gimnasio está suspendido
    if (user.role !== "superadmin" && user.gym_status === "suspended") {
      return res.status(403).json({
        success: false,
        error: "Tu cuenta de gimnasio se encuentra suspendida. Contactá al soporte de FitZone.",
      });
    }

    return res.json({ success: true, data: user });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

// Redirige al cliente a la pantalla de autorización de Mercado Pago
export async function mercadopagoConnect(req: Request, res: Response) {
  try {
    const { tenantId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ success: false, error: "tenantId es requerido" });
    }

    const clientId = process.env.MP_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/mercadopago/callback`;

    const mpAuthUrl = `https://auth.mercadopago.com/authorization?client_id=${clientId}&response_type=code&platform_id=mp&state=${tenantId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}`;

    return res.redirect(mpAuthUrl);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

// Procesa el 'code' retornado por Mercado Pago, intercambia tokens y guarda en BD
export async function mercadopagoCallback(req: Request, res: Response) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  try {
    const { code, state: tenantId } = req.query;

    if (!code || !tenantId) {
      return res.status(400).json({
        success: false,
        error: "Faltan parámetros requeridos (code o state)",
      });
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/mercadopago/callback`;

    // Intercambiar authorization_code por los tokens de producción
    const tokenResponse = await axios.post("https://api.mercadopago.com/oauth/token", {
      client_id: process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      grant_type: "authorization_code",
      code: String(code),
      redirect_uri: redirectUri,
    });

    const {
      access_token,
      refresh_token,
      public_key,
      user_id: mp_user_id,
      expires_in,
    } = tokenResponse.data;

    // Calcular la fecha exacta de expiración
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

    // Guardar o actualizar la configuración en tenant_payment_configs
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
      ) VALUES (
        ${String(tenantId)},
        'mercadopago',
        ${access_token},
        ${refresh_token},
        ${public_key},
        ${String(mp_user_id)},
        ${tokenExpiresAt},
        NOW()
      )
      ON CONFLICT (tenant_id, provider) 
      DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        public_key = EXCLUDED.public_key,
        mp_user_id = EXCLUDED.mp_user_id,
        token_expires_at = EXCLUDED.token_expires_at,
        updated_at = NOW();
    `;

    // REDIRECCIÓN CORREGIDA: Apunta a la ruta real de tu panel en Next.js
    return res.redirect(`${frontendUrl}/admin/pagos?status=success`);
  } catch (error: any) {
    console.error(
      "Error en Mercado Pago Callback:",
      error.response?.data || error.message
    );

    // REDIRECCIÓN EN CASO DE ERROR
    return res.redirect(`${frontendUrl}/admin/pagos?status=error`);
  }
}