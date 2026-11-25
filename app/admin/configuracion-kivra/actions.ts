"use server";
import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function saveIdentity(form: FormData) {
  const session = await getSession();
  if (!session || session.role !== "superadmin" || session.gymId != null) return {error:"Acceso denegado."};
  const [user] = await sql`SELECT id FROM public.users WHERE id=${session.id} AND role='superadmin' AND gym_id IS NULL`;
  if (!user) return {error:"Acceso denegado."};
  const fields = ["platform_name","tagline","website_url","support_email","support_phone","business_name","tax_id"] as const;
  const limits = [100,255,2048,254,50,150,30];
  const values = fields.map(k=>String(form.get(k)??"").trim());
  if (!values[0] || !values[1] || values.some((v,i)=>v.length>limits[i])) return {error:"Revisá los campos obligatorios y su longitud."};
  if (values[3] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values[3])) return {error:"Correo inválido."};
  if(values[2]) { try {const u=new URL(values[2]); if(u.protocol!=="https:" && u.protocol!=="http:") throw new Error();} catch {return {error:"Ingresá una URL válida."};} }
  try {
    const [row]=await sql`UPDATE public.saas_settings SET platform_name=${values[0]}, tagline=${values[1]}, website_url=${values[2]||null}, support_email=${values[3]||null}, support_phone=${values[4]||null}, business_name=${values[5]||null}, tax_id=${values[6]||null}, updated_at=NOW() WHERE id=1 RETURNING id`;
    if(!row) return {error:"No existe la configuración inicial."};
    revalidatePath("/admin/configuracion-kivra");
    return {success:true};
  } catch {return {error:"No se pudo guardar la configuración."};}
}

export async function saveBank(form: FormData) {
 try {
  const session=await getSession();
  if(!session || session.role!=="superadmin" || session.gymId!=null) return {error:"Acceso denegado."};
  const [user]=await sql`SELECT id FROM public.users WHERE id=${session.id} AND role='superadmin' AND gym_id IS NULL`;
  if(!user) return {error:"Acceso denegado."};
  const bank=String(form.get("bank_name")??"").trim(), holder=String(form.get("bank_account_holder")??"").trim(), cbu=String(form.get("bank_cbu")??"").trim(), alias=String(form.get("bank_alias")??"").trim();
  if(bank.length>100 || holder.length>150 || alias.length>100 || (cbu && !/^\d{22}$/.test(cbu))) return {error:"Revisá los datos. El CBU/CVU debe tener 22 dígitos."};
  if((bank||holder||cbu||alias) && (!holder || (!cbu && !alias))) return {error:"Ingresá titular y CBU/CVU o alias."};
  const [row]=await sql`UPDATE public.saas_settings SET bank_name=${bank||null},bank_account_holder=${holder||null},bank_cbu=${cbu||null},bank_alias=${alias||null},updated_at=NOW() WHERE id=1 RETURNING id`;
  if(!row) return {error:"Configuración inicial inexistente."};
  revalidatePath("/admin/configuracion-kivra");
  revalidatePath("/admin/mi-suscripcion");
  return {success:true};
 } catch {return {error:"No se pudieron guardar los datos bancarios."};}
}
