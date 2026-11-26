"use server";
import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function savePaymentMethods(mp: boolean, bank: boolean): Promise<{success?: boolean; error?: string}> {
 try {
  const session = await getSession();
  if (!session || session.role !== "superadmin" || session.gymId != null) return {error:"Acceso denegado."};
  if (typeof mp !== "boolean" || typeof bank !== "boolean") return {error:"Preferencias inválidas."};
  if (mp) {
   try {
    const origin = new URL(process.env.KIVRA_PUBLIC_URL || "");
    const webhook = new URL(process.env.KIVRA_MP_TEST_NOTIFICATION_URL || "");
    if (process.env.KIVRA_SAAS_TEST_CHECKOUT_ENABLED !== "true" || !process.env.KIVRA_MP_TEST_ACCESS_TOKEN || origin.protocol !== "https:" || webhook.origin !== origin.origin || webhook.pathname !== "/api/saas/mercadopago/webhook" || !webhook.searchParams.get("x-vercel-protection-bypass") || webhook.username || webhook.password || webhook.hash) throw new Error();
   } catch { return {error:"Mercado Pago en modo pruebas no está configurado correctamente."}; }
  }
  const [row] = await sql`
   WITH changed AS (
    UPDATE public.saas_settings SET mp_payments_enabled=${mp}, bank_transfers_enabled=${bank}, updated_at=NOW()
    WHERE id=1 AND EXISTS (SELECT 1 FROM public.users WHERE id=${session.id} AND role='superadmin' AND gym_id IS NULL AND session_version=${session.sessionVersion})
    AND (NOT ${bank} OR (NULLIF(btrim(bank_account_holder),'') IS NOT NULL AND (bank_cbu ~ '^[0-9]{22}$' OR NULLIF(btrim(bank_alias),'') IS NOT NULL)))
    RETURNING id
   )
   INSERT INTO public.saas_audit_log(actor_user_id,action,entity_type,entity_id,details)
   SELECT ${session.id},'payment_methods_updated','saas_settings',id::text,jsonb_build_object('mp_payments_enabled',${mp}::boolean,'bank_transfers_enabled',${bank}::boolean) FROM changed RETURNING id
  `;
  if (!row) return {error:"Verificá los permisos, la configuración inicial y los datos bancarios."};
  revalidatePath("/admin/configuracion-kivra");
  revalidatePath("/admin/mi-suscripcion");
  return {success:true};
 } catch { return {error:"No se pudieron guardar los medios de cobro."}; }
}
