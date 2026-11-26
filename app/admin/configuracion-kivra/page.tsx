import { getSession } from "@/app/actions";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import IdentityForm from "./IdentityForm";
import BankForm from "./BankForm";
import BillingForm from "./BillingForm";
import SecurityForm from "./SecurityForm";
import TotpForm from "./TotpForm";
import SecurityHistory from "./SecurityHistory";
import { Settings2, ShieldCheck, Globe2, CreditCard, Bell } from "lucide-react";

export default async function ConfiguracionKivraPage() {
 const session=await getSession();
 if(!session) redirect("/login");
 if(session.role!=="superadmin" || session.gymId!=null) redirect("/admin");
 const [user]=await sql`SELECT id FROM public.users WHERE id=${session.id} AND role='superadmin' AND gym_id IS NULL`;
 if(!user) redirect("/login");
 const [settings]=await sql`SELECT platform_name,tagline,website_url,support_email,support_phone,business_name,tax_id,bank_name,bank_account_holder,bank_cbu,bank_alias,billing_due_days FROM public.saas_settings WHERE id=1`;
 const [factor]=await sql`SELECT user_id FROM public.superadmin_totp WHERE user_id=${session.id} AND enabled_at IS NOT NULL`;
 const auditRows=await sql`SELECT a.id::text AS id,a.created_at,a.action,a.details->>'result' AS result,a.details->>'ip' AS ip,COALESCE(u.email,'Usuario eliminado') AS actor FROM public.saas_audit_log a LEFT JOIN public.users u ON u.id=a.actor_user_id WHERE a.entity_type='superadmin_security' ORDER BY a.created_at DESC,a.id DESC LIMIT 200`;
 const events=auditRows.map(a=>({id:String(a.id),date:new Date(a.created_at).toISOString(),action:String(a.action),result:String(a.result??""),ip:String(a.ip??""),actor:String(a.actor)}));
 const values=Object.fromEntries(Object.entries(settings||{}).map(([k,v])=>[k,String(v??"")]));
 return <div className="min-w-0 space-y-6">
 <header className="border-b border-border pb-5"><p className="text-xs font-semibold uppercase tracking-widest text-primary">Kivra SaaS</p><h1 className="mt-2 text-3xl font-bold">Configuración Kivra</h1><p className="mt-1 text-muted-foreground">Administración global de la plataforma.</p></header>
 <Card><CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="size-5 text-primary"/> Identidad comercial</CardTitle><p className="text-sm text-muted-foreground">Datos globales guardados en la base de datos.</p></CardHeader><CardContent>{settings?<IdentityForm values={values}/>:<p>No existe la configuración inicial en Neon.</p>}</CardContent></Card>
 <Card><CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="size-5 text-primary"/> Datos bancarios de Kivra</CardTitle><p className="text-sm text-muted-foreground">Cuenta receptora de transferencias de los gimnasios.</p></CardHeader><CardContent>{settings?<BankForm values={values}/>:<p>Configuración inicial inexistente.</p>}</CardContent></Card>
 <Card><CardHeader><CardTitle>Condiciones de facturación</CardTitle></CardHeader><CardContent>{settings?<BillingForm days={values.billing_due_days}/>:<p>Configuración inicial inexistente.</p>}</CardContent></Card>
 <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary"/> Seguridad</CardTitle><p className="text-sm text-muted-foreground">Protegé el acceso del superadmin.</p></CardHeader><CardContent className="space-y-6"><SecurityForm/><TotpForm enabled={Boolean(factor)}/></CardContent></Card>
 <Card><CardHeader><CardTitle>Actividad de seguridad</CardTitle><p className="text-sm text-muted-foreground">Últimos 200 eventos registrados del superadmin.</p></CardHeader><CardContent><SecurityHistory events={events}/></CardContent></Card>
 <div className="grid gap-4 sm:grid-cols-2">{[{title:"Integraciones",Icon:Globe2,description:"Las credenciales se administran mediante variables de entorno. No se exponen en esta pantalla."},{title:"Notificaciones",Icon:Bell,description:"Pendiente de conectar las preferencias con los eventos comerciales."}].map(({title,Icon,description})=><Card key={title}><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Icon className="size-5 text-primary"/>{title}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{description}</CardContent></Card>)}</div>
 </div>;
}
