import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { RequestPlanButton } from "./RequestPlanButton";

export const dynamic = "force-dynamic";

export default async function MemberPlansPage() {
  const session = await getSession();
  if (!session || session.role !== "member" || session.gymId == null) redirect("/login");

  const [member] = await sql`SELECT id FROM members WHERE user_id = ${session.id} AND gym_id = ${session.gymId} LIMIT 1`;
  if (!member) return <div className="p-6">No encontramos tu perfil de alumno en este gimnasio.</div>;

  const plans = await sql`
    SELECT id, name, description, price, access_mode, duration_days, max_entries
    FROM membership_plans WHERE gym_id = ${session.gymId} AND is_active = true
    ORDER BY price ASC, name ASC
  `;
  const requests = await sql`
    SELECT r.id, p.name FROM member_plan_requests r
    JOIN membership_plans p ON p.id = r.plan_id AND p.gym_id = r.gym_id
    WHERE r.gym_id = ${session.gymId} AND r.member_id = ${member.id} AND r.status = 'pending'
    LIMIT 1
  `;
  const subscriptions = await sql`
    SELECT s.id FROM subscriptions s
    JOIN membership_plans p ON p.id = s.plan_id AND p.gym_id = ${session.gymId}
    WHERE s.member_id = ${member.id} AND s.status IN ('active','scheduled') AND s.end_date > CURRENT_DATE
    LIMIT 1
  `;

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-5 sm:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Planes de mi gimnasio</h1>
        <p className="text-sm text-muted-foreground">Elegí entre los planes disponibles en tu gimnasio. La solicitud no activa el acceso ni realiza un cobro.</p>
      </div>
      {requests.length > 0 && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">Tenés una solicitud pendiente para <strong>{requests[0].name}</strong>. Tu gimnasio debe confirmarla.</div>}
      {subscriptions.length > 0 && <div className="rounded-xl border p-4 text-sm">Ya tenés una membresía vigente o programada. <Link className="text-primary underline" href="/miembro/membresia">Ver mi membresía</Link>.</div>}
      {plans.length === 0 ? <p className="rounded-xl border p-5 text-sm">Tu gimnasio todavía no tiene planes disponibles. Consultá con la administración.</p> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.id} className="flex min-w-0 flex-col justify-between gap-4 rounded-xl border bg-card p-5">
              <div className="space-y-2">
                <h2 className="text-lg font-bold">{plan.name}</h2>
                <p className="text-2xl font-bold text-primary">{Number(plan.price).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 })}</p>
                <p className="text-sm text-muted-foreground">{plan.description || "Consultá los beneficios con tu gimnasio."}</p>
                <p className="text-xs text-muted-foreground">{plan.access_mode === "entry_pack" ? `${plan.max_entries} ingresos` : plan.access_mode === "fixed_days" ? "Pase por días" : "Membresía"}{plan.duration_days ? ` · ${plan.duration_days} días` : ""}</p>
              </div>
              {requests.length === 0 && subscriptions.length === 0 && <RequestPlanButton planId={Number(plan.id)} />}
            </article>
          ))}
        </div>
      )}
      <Link href="/miembro/membresia" className="inline-block text-sm text-primary underline">Volver a mi membresía</Link>
    </main>
  );
}
