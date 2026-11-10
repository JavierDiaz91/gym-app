import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { sql } from "@/lib/db";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

export const hashResetToken = (token: string) => createHash("sha256").update(token).digest("hex");

const genericMessage = "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.";

export async function requestPasswordReset(emailInput: string) {
  const email = emailInput.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { error: "Ingresá un correo electrónico válido." };
  }
  const [user] = await sql`SELECT id, email FROM public.users WHERE lower(email) = ${email} LIMIT 1`;
  if (!user) return { message: genericMessage };

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "465");
  const username = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const appUrl = process.env.APP_URL;
  if (!host || !username || !password || !appUrl || !Number.isInteger(port) || ![465,587].includes(port)) {
    console.error("Password reset SMTP configuration is incomplete");
    return { error: "El servicio de recuperación no está disponible temporalmente." };
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  const origin = new URL(appUrl).origin;
  const resetUrl = new URL("/restablecer-contrasena", origin);
  resetUrl.searchParams.set("token", token);

  // Limit repeated requests per user; do not expose account existence.
  const [recent] = await sql`SELECT count(*)::integer AS total FROM public.password_reset_tokens
    WHERE user_id = ${user.id} AND created_at > now() - interval '15 minutes'`;
  if (Number(recent.total) >= 3) return { message: genericMessage };

  await sql`INSERT INTO public.password_reset_tokens(user_id, token_hash, expires_at)
    VALUES (${user.id}, ${tokenHash}, ${expiresAt.toISOString()})`;
  try {
    const transport = nodemailer.createTransport({
      host, port, secure: port === 465,
      auth: { user: username, pass: password },
    });
    await transport.sendMail({
      from: `Kivra <${username}>`,
      to: String(user.email),
      subject: "Restablecé tu contraseña de Kivra",
      text: `Solicitaste cambiar tu contraseña de Kivra. Abrí este enlace (válido por 30 minutos):\n\n${resetUrl.toString()}\n\nSi no lo solicitaste, ignorá este correo.`,
    });
  } catch (error) {
    console.error("Could not send password reset email", error);
    await sql`DELETE FROM public.password_reset_tokens WHERE token_hash = ${tokenHash}`;
    return { error: "No se pudo enviar el correo. Intentá nuevamente más tarde." };
  }
  return { message: genericMessage };
}

export async function resetPassword(token: string, password: string) {
  if (!/^[a-f0-9]{64}$/.test(token) || password.length < 8 || password.length > 128) {
    return { error: "Enlace inválido o contraseña fuera del rango permitido (8 a 128 caracteres)." };
  }
  const hash = hashResetToken(token);
  const [record] = await sql`SELECT id, user_id FROM public.password_reset_tokens
    WHERE token_hash = ${hash} AND used_at IS NULL AND expires_at > now() LIMIT 1`;
  if (!record) return { error: "El enlace venció o ya fue utilizado. Solicitá uno nuevo." };
  const passwordHash = await bcrypt.hash(password, 12);
  // Atomic consumption: only one request can use the token.
  const [consumed] = await sql`
    WITH consumed AS (
      UPDATE public.password_reset_tokens SET used_at = now()
      WHERE id = ${record.id} AND used_at IS NULL AND expires_at > now()
      RETURNING user_id
    ), updated AS (
      UPDATE public.users SET password_hash = ${passwordHash}, updated_at = now()
      WHERE id IN (SELECT user_id FROM consumed)
      RETURNING id
    )
    SELECT id FROM updated LIMIT 1
  `;
  if (!consumed) return { error: "El enlace venció o ya fue utilizado." };
  await sql`UPDATE public.password_reset_tokens SET used_at = now()
    WHERE user_id = ${record.user_id} AND used_at IS NULL`;
  return { success: true };
}
