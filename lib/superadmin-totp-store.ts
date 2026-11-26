import "server-only";
import { sql } from "@/lib/db";
import { decryptSecret, matchingStep, recoveryHash } from "./superadmin-totp";

export async function verifySecondFactor(userId:number,code:string){
 const [row]=await sql`SELECT encrypted_secret,last_used_step,enabled_at,locked_until FROM public.superadmin_totp WHERE user_id=${userId} AND enabled_at IS NOT NULL`;
 if(!row || (row.locked_until && new Date(row.locked_until).getTime()>Date.now()))return false;
 const step=matchingStep(decryptSecret(row.encrypted_secret,userId),code);
 if(step!==null){
 const [used]=await sql`UPDATE public.superadmin_totp SET last_used_step=${step},failed_attempts=0,locked_until=NULL WHERE user_id=${userId} AND enabled_at IS NOT NULL AND encrypted_secret=${row.encrypted_secret} AND last_used_step<${step} AND (locked_until IS NULL OR locked_until<=now()) RETURNING user_id`;
 if(used)return true;
 } else if(/^[a-fA-F0-9]{32}$/.test(code.trim())){
 const [used]=await sql`WITH guard AS (UPDATE public.superadmin_totp SET failed_attempts=0,locked_until=NULL WHERE user_id=${userId} AND enabled_at IS NOT NULL AND encrypted_secret=${row.encrypted_secret} AND (locked_until IS NULL OR locked_until<=now()) AND EXISTS (SELECT 1 FROM public.superadmin_recovery_codes WHERE user_id=${userId} AND code_hash=${recoveryHash(code,userId)} AND used_at IS NULL) RETURNING user_id) UPDATE public.superadmin_recovery_codes c SET used_at=now() FROM guard WHERE c.user_id=guard.user_id AND c.code_hash=${recoveryHash(code,userId)} AND c.used_at IS NULL RETURNING c.id`;
 if(used)return true;
 }
 await sql`UPDATE public.superadmin_totp SET failed_attempts=CASE WHEN locked_until<=now() THEN 1 ELSE failed_attempts+1 END,locked_until=CASE WHEN locked_until<=now() THEN NULL WHEN failed_attempts>=4 THEN now()+interval '15 minutes' ELSE NULL END WHERE user_id=${userId} AND enabled_at IS NOT NULL AND encrypted_secret=${row.encrypted_secret} AND (locked_until IS NULL OR locked_until<=now())`;
 return false;
}
