import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ResolveButtons } from "./ResolveButtons";

export const dynamic = "force-dynamic";

export default async function GymPlanRequestsPage() {
  const session = await getSession();
  if (!session || !["admin", "superadmin"].includes(session.role) || session.gymId == null) redirect("/login");

  const requests = await sql`
    SELECT r.id, r.created_at, m.first_name, m.last_name, m.id AS member_id,
           p.name AS plan_name, p.price
    FROM member_plan_requests r
    JOIN members m ON m.id = r.member_id AND m.gym_id = r.gym_id
    JOIN membership_plans p ON p.id = r.plan_id AND p.gym_id = r.gym_id
    WHERE r.gym_id = ${session.gymId} AND r.status = 'pending'
    ORDER BY r.created_at ASC
  `;

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Solicitudes de membresía</h1>
        <p className="text-sm text-muted-foreground">Solicitudes enviadas por alumnos de tu gimnasio. No activan el acceso automáticamente.</p>
      </div>
      {requests.length === 0 ? <p className="rounded-xl border p-5">No hay solicitudes pendientes.</p> : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl border bg-card p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">{r.first_name} {r.last_name}</h2>
                <p className="text-sm text-muted-foreground">{r.plan_name} · {Number(r.price).toLocaleString("es-AR", { style: "currency", currency: "ARS" })}</p>
                <p className="text-xs text-muted-foreground">Alumno #{r.member_id} · Solicitud #{r.id}</p>
              </div>
              <div className="space-y-2"><ResolveButtons requestId={Number(r.id)} /><Link href="/admin/miembros" className="inline-block text-xs text-primary underline">Ver alumnos</Link></div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
