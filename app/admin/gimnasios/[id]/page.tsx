import { getSaaSPlansAction, getSession } from "@/app/actions";
import GymManagementActions from "./GymManagementActions";
import { sql } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, CalendarDays, CreditCard, Users, Dumbbell, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const gymStates: Record<string, string> = { active: "Activo", suspended: "Suspendido" };
const subscriptionStates: Record<string, string> = { active: "Activa", trial: "En prueba", past_due: "Vencida", cancelled: "Cancelada" };
const invoiceStates: Record<string, string> = { pending: "Pendiente", paid: "Pagada", overdue: "Vencida", cancelled: "Cancelada" };
const money = (value: unknown) => "$" + Number(value || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function dateOnly(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("es-AR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });
}
function timestamp(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
}

export default async function GymDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "superadmin") redirect("/admin");

  const { id } = await params;
  const gymId = Number(id);
  if (!Number.isSafeInteger(gymId) || gymId <= 0) notFound();

  const [gym] = await sql`SELECT id, name, slug, status FROM gyms WHERE id = ${gymId} LIMIT 1`;
  if (!gym) notFound();

  const [admins, membersCount, trainersCount, subscriptions, invoices, activity, plansResult] = await Promise.all([
    sql`SELECT id, email, created_at FROM users WHERE gym_id = ${gymId} AND role = 'admin' ORDER BY created_at ASC`,
    sql`SELECT COUNT(*)::int AS total FROM members WHERE gym_id = ${gymId}`,
    sql`SELECT COUNT(*)::int AS total FROM trainers WHERE gym_id = ${gymId}`,
    sql`SELECT gss.plan_id, gss.status, gss.current_period_start, gss.current_period_end, gss.next_billing_date, COALESCE(gss.price_override, sp.monthly_price) AS price, sp.name AS plan_name FROM gym_saas_subscriptions gss JOIN saas_plans sp ON sp.id = gss.plan_id WHERE gss.gym_id = ${gymId} LIMIT 1`,
    sql`SELECT id, period_start, period_end, amount, status, due_date, paid_at FROM saas_invoices WHERE gym_id = ${gymId} ORDER BY created_at DESC LIMIT 10`,
    sql`SELECT id, action, details, created_at FROM saas_audit_log WHERE gym_id = ${gymId} ORDER BY created_at DESC LIMIT 10`,
    getSaaSPlansAction()
  ]);
  const subscription = subscriptions[0];

  return (
    <div className="space-y-6">
      <Link href="/admin/gimnasios" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Volver a gimnasios</Link>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Kivra SaaS · Ficha de cliente</p><h1 className="mt-2 text-3xl font-bold">{gym.name}</h1><p className="mt-1 text-sm text-muted-foreground">{gym.slug} · ID {gym.id}</p></div>
        <Badge variant="outline">{gymStates[gym.status] || gym.status}</Badge>
      </div>
      <GymManagementActions gymId={gymId} gymName={gym.name} status={gym.status} planId={subscription?.plan_id ? Number(subscription.plan_id) : null} plans={plansResult.success ? plansResult.data.map((plan: any) => ({ id: Number(plan.id), name: String(plan.name), status: String(plan.status) })) : []} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><Users className="h-5 w-5 text-primary"/><p className="mt-3 text-3xl font-bold">{membersCount[0]?.total ?? 0}</p><p className="text-sm text-muted-foreground">Alumnos</p></CardContent></Card>
        <Card><CardContent className="p-5"><Dumbbell className="h-5 w-5 text-primary"/><p className="mt-3 text-3xl font-bold">{trainersCount[0]?.total ?? 0}</p><p className="text-sm text-muted-foreground">Entrenadores</p></CardContent></Card>
        <Card><CardContent className="p-5"><Building2 className="h-5 w-5 text-primary"/><p className="mt-3 text-3xl font-bold">{admins.length}</p><p className="text-sm text-muted-foreground">Administradores</p></CardContent></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Administradores</CardTitle></CardHeader><CardContent className="space-y-3">{admins.length ? admins.map((admin: any) => <div key={admin.id} className="rounded-lg border border-border p-3"><p className="font-medium break-all">{admin.email}</p><p className="text-xs text-muted-foreground">Alta: {timestamp(admin.created_at)}</p></div>) : <p className="text-sm text-muted-foreground">Sin administradores registrados.</p>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5"/> Suscripción SaaS</CardTitle></CardHeader><CardContent>{subscription ? <div className="space-y-2 text-sm"><p><strong>Plan:</strong> {subscription.plan_name}</p><p><strong>Estado:</strong> {subscriptionStates[subscription.status] || subscription.status}</p><p><strong>Precio mensual:</strong> {money(subscription.price)}</p><p><strong>Período:</strong> {dateOnly(subscription.current_period_start)} al {dateOnly(subscription.current_period_end)}</p><p><strong>Próximo cobro:</strong> {dateOnly(subscription.next_billing_date)}</p></div> : <p className="text-sm text-muted-foreground">Este gimnasio todavía no tiene un plan SaaS asignado.</p>}</CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5"/> Últimas facturas SaaS</CardTitle></CardHeader><CardContent>{invoices.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-border text-muted-foreground"><th className="pb-3">Factura</th><th className="pb-3">Período</th><th className="pb-3">Importe</th><th className="pb-3">Vencimiento</th><th className="pb-3">Estado</th></tr></thead><tbody>{invoices.map((invoice: any) => <tr key={invoice.id} className="border-b border-border/50"><td className="py-3">#{invoice.id}</td><td className="py-3">{dateOnly(invoice.period_start)} – {dateOnly(invoice.period_end)}</td><td className="py-3">{money(invoice.amount)}</td><td className="py-3">{dateOnly(invoice.due_date)}</td><td className="py-3">{invoiceStates[invoice.status] || invoice.status}</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">Sin facturas emitidas.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5"/> Actividad reciente</CardTitle></CardHeader><CardContent className="space-y-3">{activity.length ? activity.map((event: any) => <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"><span className="text-sm">{({ gym_status_changed: "Estado del gimnasio actualizado", gym_saas_plan_assigned: "Plan SaaS asignado", saas_invoice_generated: "Factura generada", saas_invoice_paid: "Factura pagada" } as Record<string, string>)[event.action] || event.action.replaceAll("_", " ")}</span><span className="text-xs text-muted-foreground">{timestamp(event.created_at)}</span></div>) : <p className="text-sm text-muted-foreground">Sin eventos registrados.</p>}</CardContent></Card>
    </div>
  );
}
