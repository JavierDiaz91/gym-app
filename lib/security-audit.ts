import "server-only";
import { sql } from "@/lib/db";
import { headers } from "next/headers";

export async function auditSecurity(actorId:number, action:string, result:"success"|"failure") {
 try {
  const h=await headers();
  const ip=h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim().slice(0,64)||null;
  await sql`INSERT INTO public.saas_audit_log (actor_user_id,action,entity_type,entity_id,details) VALUES (${actorId},${action},'superadmin_security',${String(actorId)},${JSON.stringify({result,ip})}::jsonb)`;
 } catch { console.error("Security audit write failed"); }
}
