"use server";
import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { auditSecurity } from "@/lib/security-audit";
import { generateSecret, encryptSecret, decryptSecret, base32, matchingStep, generateRecoveryCodes, recoveryHash } from "@/lib/superadmin-totp";
import { verifySecondFactor } from "@/lib/superadmin-totp-store";

async function authorized(password:string){
 const s=await getSession();
 if(!s || s.role!=="superadmin" || s.gymId!==null || typeof password!=="string" || password.length>256)return null;
 const [u]=await sql`SELECT password_hash FROM public.users WHERE id=${s.id} AND role='superadmin' AND gym_id IS NULL AND session_version=${s.sessionVersion}`;
 return u && await bcrypt.compare(password,u.password_hash)?s:null;
}
export async function startTotp(password:string){
 try{
 const s=await authorized(password);if(!s)return {error:"Contraseña incorrecta o sesión vencida."};
 const secret=generateSecret(), encrypted=encryptSecret(secret,s.id);
 const [row]=await sql`INSERT INTO public.superadmin_totp(user_id,encrypted_secret) SELECT id,${encrypted} FROM public.users WHERE id=${s.id} AND session_version=${s.sessionVersion} AND role='superadmin' AND gym_id IS NULL ON CONFLICT(user_id) DO UPDATE SET encrypted_secret=EXCLUDED.encrypted_secret WHERE superadmin_totp.enabled_at IS NULL RETURNING user_id`;
 if(!row)return {error:"No se puede iniciar la configuración."};
 return {secret:base32(secret),email:s.email};
 }catch{return {error:"No se pudo iniciar la configuración."};}
}
export async function enableTotp(password:string,code:string){
 try{
 const s=await authorized(password);if(!s)return {error:"Contraseña incorrecta o sesión vencida."};
 const [row]=await sql`SELECT encrypted_secret FROM public.superadmin_totp WHERE user_id=${s.id} AND enabled_at IS NULL`;
 if(!row)return {error:"Iniciá la configuración nuevamente."};
 const step=matchingStep(decryptSecret(row.encrypted_secret,s.id),code);
 if(step===null)return {error:"Código incorrecto."};
 const codes=generateRecoveryCodes(), hashes=codes.map(c=>recoveryHash(c,s.id));
 const result=await sql`WITH account AS (UPDATE public.users SET session_version=session_version+1 WHERE id=${s.id} AND session_version=${s.sessionVersion} AND role='superadmin' AND gym_id IS NULL AND EXISTS(SELECT 1 FROM public.superadmin_totp WHERE user_id=${s.id} AND enabled_at IS NULL AND encrypted_secret=${row.encrypted_secret}) RETURNING id), enabled AS (UPDATE public.superadmin_totp SET enabled_at=now(),last_used_step=${step},failed_attempts=0,locked_until=NULL FROM account WHERE user_id=account.id AND enabled_at IS NULL AND encrypted_secret=${row.encrypted_secret} RETURNING user_id) INSERT INTO public.superadmin_recovery_codes(user_id,code_hash) SELECT enabled.user_id,h FROM enabled CROSS JOIN unnest(${hashes}::text[]) AS h RETURNING id`;
 if(result.length!==10)return {error:"No se pudo activar. Volvé a iniciar sesión."};
 await auditSecurity(s.id,"totp_enabled","success");
 (await cookies()).delete("session");
 return {codes};
 }catch{return {error:"No se pudo activar el segundo factor."};}
}
export async function disableTotp(password:string,code:string){
 try{
 const s=await authorized(password);if(!s)return {error:"Contraseña incorrecta o sesión vencida."};
 if(!await verifySecondFactor(s.id,code)){await auditSecurity(s.id,"totp_disabled","failure");return {error:"Código inválido o acceso bloqueado."};}
 const [row]=await sql`WITH account AS (UPDATE public.users SET session_version=session_version+1 WHERE id=${s.id} AND session_version=${s.sessionVersion} AND role='superadmin' AND gym_id IS NULL RETURNING id) DELETE FROM public.superadmin_totp t USING account WHERE t.user_id=account.id AND t.enabled_at IS NOT NULL RETURNING t.user_id`;
 if(!row)return {error:"La sesión cambió."};
 await auditSecurity(s.id,"totp_disabled","success");
 (await cookies()).delete("session");
 return {success:true};
 }catch{return {error:"No se pudo desactivar el segundo factor."};}
}
