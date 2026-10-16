import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function date(value: unknown) {
  if (!value) return "-";
  const iso = String(value).slice(0, 10);
  const parts = iso.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : iso;
}

function money(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString("es-AR", { style: "currency", currency: "ARS" }) : "Sin definir";
}

const labels: Record<string, string> = {
  pending: "Pendiente", overdue: "Vencida", paid: "Pagada", cancelled: "Cancelada"
};

export default async function MiSuscripcionKivraPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin" || session.gymId == null) redirect("/admin");

  // Never accept gym_id from a query parameter or client input.
  const gymId = session.gymId;
  const [subscription] = await sql`
    SELECT s.id, s.status, s.current_period_start, s.current_period_end,
           s.next_billing_date, p.name AS plan_name,
           COALESCE(s.price_override, p.monthly_price) AS monthly_price
    FROM gym_saas_subscriptions s
    JOIN saas_plans p ON p.id = s.plan_id
    WHERE s.gym_id = ${gymId}
    LIMIT 1
  `;
  const invoices = await sql`
    SELECT id, period_start, period_end, amount, status, due_date, paid_at
    FROM saas_invoices
    WHERE gym_id = ${gymId}
    ORDER BY period_start DESC NULLS LAST, id DESC
    LIMIT 24
  `;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Kivra SaaS</p>
        <h1 className="mt-2 text-3xl font-bold">Mi suscripción a Kivra</h1>
        <p className="mt-1 text-muted-foreground">Consultá tu plan y el historial de cuotas del gimnasio.</p>
      </div>
      {subscription ? (
        <Card>
          <CardHeader><CardTitle>Plan {String(subscription.plan_name)}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Estado:</strong> {String(subscription.status)}</p>
            <p><strong>Precio mensual:</strong> {money(subscription.monthly_price)}</p>
            <p><strong>Período registrado:</strong> {date(subscription.current_period_start)} al {date(subscription.current_period_end)}</p>
            <p><strong>Próximo vencimiento registrado:</strong> {date(subscription.next_billing_date)}</p>
          </CardContent>
        </Card>
      ) : (
        <Card><CardContent className="p-6">Tu gimnasio todavía no tiene un plan SaaS asignado. Contactá a Kivra.</CardContent></Card>
      )}
      <Card>
        <CardHeader><CardTitle>Cuotas registradas</CardTitle></CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay cuotas registradas para este gimnasio.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b text-muted-foreground"><th className="py-3">Período</th><th>Importe</th><th>Vencimiento</th><th>Estado</th></tr></thead>
                <tbody>{invoices.map((invoice) => (
                  <tr key={Number(invoice.id)} className="border-b">
                    <td className="py-3">{date(invoice.period_start)} - {date(invoice.period_end)}</td>
                    <td>{money(invoice.amount)}</td>
                    <td>{date(invoice.due_date)}</td>
                    <td>{labels[String(invoice.status)] ?? String(invoice.status)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          <p className="mt-4 text-xs text-muted-foreground">Los pagos online y la presentación de transferencias estarán disponibles cuando se complete y valide la integración. Esta pantalla es solo de consulta.</p>
        </CardContent>
      </Card>
    </div>
  );
}
