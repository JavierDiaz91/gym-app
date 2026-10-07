import { getSession } from "@/app/actions";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { CreditCard, Calendar, CheckCircle2, AlertTriangle, Clock, History, Lock } from "lucide-react";
import { PayButton } from "./PayButton"; // Creamos este cliente para el botón de pago

// Helper para formatear y traducir estados de pago
function formatStatus(status: string) {
  const normalized = status?.toLowerCase() || "";
  
  switch (normalized) {
    case "completed":
    case "completado":
    case "paid":
    case "pagado":
      return { text: "Completado", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
    case "pending":
    case "pendiente":
      return { text: "Pendiente", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
    case "failed":
    case "fallido":
    case "rejected":
      return { text: "Fallido", className: "bg-red-500/10 text-red-600 border-red-500/20" };
    default:
      return { text: status || "Completado", className: "bg-slate-500/10 text-slate-600 border-slate-500/20" };
  }
}

// Helper para formatear fechas de forma limpia evitando desfasajes UTC
function formatDate(dateString: string | null | undefined) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("es-AR", {
    timeZone: "UTC",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

interface SubscriptionData {
  member_id: number;
  member_status: string;
  plan_id: number;
  start_date: string;
  end_date: string;
  status: string;
  plan_name: string;
  price: number;
  description: string;
}

interface PaymentData {
  id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  status: string;
}

export default async function MembershipPage() {
  const session = await getSession();
  if (!session || session.role !== "member" || session.gymId == null) redirect("/login");

  const userId = session.id;

  let subscription: SubscriptionData | null = null;
  let payments: PaymentData[] = [];

  try {
    // 1. Obtener datos de la membresía + estado del socio (m.status)
   // 1. Obtener datos de membresía con Fallback al plan por defecto del gimnasio
const subResult = await sql`
  SELECT 
    m.id AS member_id,
    m.status AS member_status,
    COALESCE(s.plan_id, p_default.id) AS plan_id,
    s.start_date,
    s.end_date,
    s.status AS subscription_status,
    COALESCE(p_sub.name, p_default.name, 'Pase Libre') AS plan_name,
    COALESCE(p_sub.price, p_default.price, 0) AS price
  FROM members m
  LEFT JOIN subscriptions s ON s.member_id = m.id AND s.status = 'active'
  LEFT JOIN membership_plans p_sub ON p_sub.id = s.plan_id
  LEFT JOIN membership_plans p_default ON p_default.is_active = true AND (p_default.gym_id = m.gym_id OR m.gym_id IS NULL)
  WHERE m.user_id = ${userId}
    AND m.gym_id = ${session.gymId}
  ORDER BY s.end_date DESC NULLS LAST
  LIMIT 1
`;

const subRows = Array.isArray(subResult) ? subResult : (subResult as any).rows || [];
subscription = (subRows[0] as SubscriptionData) || null;

    // 2. Obtener el historial de pagos
    const payResult = await sql`
      SELECT 
        p.id,
        p.amount,
        p.payment_date,
        p.payment_method,
        p.status
      FROM payments p
      JOIN members m ON m.id = p.member_id
      WHERE m.user_id = ${userId}
    AND m.gym_id = ${session.gymId}
      ORDER BY p.payment_date DESC
      LIMIT 10
    `;
    
    payments = (Array.isArray(payResult) ? payResult : (payResult as any).rows || []) as PaymentData[];
  } catch (error) {
    console.error("Error al obtener datos de membresía:", error);
  }

  // Evaluar si la cuenta está suspendida o la cuota vencida
  const isSuspended = subscription?.member_status === "suspended" || subscription?.member_status === "inactive";
  const isDateExpired = subscription?.end_date 
    ? new Date(subscription.end_date) < new Date() 
    : true;

  const isBlocked = isSuspended || isDateExpired;

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-primary" />
          Mi Membresía
        </h1>
        <p className="text-sm text-muted-foreground">
          Estado de tu plan, fechas de vencimiento e historial de pagos
        </p>
      </div>

      {/* Tarjeta de Estado del Plan */}
      <div className="bg-card text-card-foreground border rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Plan Actual
            </span>
            <h2 className="text-2xl font-bold text-foreground mt-1">
              {subscription?.plan_name || "Sin Plan Activo"}
            </h2>
            {subscription?.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {subscription.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isBlocked ? (
              <span className="px-3 py-1 bg-red-500/10 text-red-600 border border-red-500/20 rounded-full text-xs font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> 
                {isSuspended ? "Cuenta Suspendida" : "Cuota Vencida"}
              </span>
            ) : (
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Al Día
              </span>
            )}
          </div>
        </div>

        {/* Banner de Regularización / Pagar con Mercado Pago */}
        {isBlocked && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/10 text-red-600 rounded-lg shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-foreground text-sm">
                  Regularizá tu cuenta para entrenar
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Aboná tu cuota mensual para volver a habilitar tu acceso a las rutinas del gimnasio.
                </p>
              </div>
            </div>

            {/* Componente botón de pago en el cliente */}
            <PayButton 
              memberId={subscription?.member_id}
              planId={subscription?.plan_id}
              planName={subscription?.plan_name || 'Plan Fitness'}
              price={subscription?.price || 0}
            />
          </div>
        )}

        {/* Detalles de Fechas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 border rounded-lg bg-background">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Fecha de Inicio</p>
              <p className="font-medium text-sm">
                {formatDate(subscription?.start_date)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 border rounded-lg bg-background">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Fecha de Vencimiento</p>
              <p className="font-medium text-sm">
                {formatDate(subscription?.end_date)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Historial de Pagos */}
      <div className="bg-card text-card-foreground border rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Historial de Pagos
        </h3>

        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No hay registros de pagos recientes.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Método</th>
                  <th className="px-4 py-3">Monto</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((p) => {
                  const statusBadge = formatStatus(p.status);
                  return (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        {formatDate(p.payment_date)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.payment_method || "Efectivo"}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        ${Number(p.amount || 0).toLocaleString("es-AR")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${statusBadge.className}`}>
                          {statusBadge.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}