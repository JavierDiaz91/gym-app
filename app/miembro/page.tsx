import { getSession } from "@/app/actions";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import Link from "next/link";
import { 
  Calendar, 
  CreditCard, 
  Activity, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle,
  User,
  Clock,
  Dumbbell,
  Play,
  Flame,
  Zap,
  Check,
  Lock
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface MemberDashboardData {
  id: number;
  first_name: string;
  last_name: string;
  start_date: string | null;
  end_date: string | null;
  sub_status: string | null;
  plan_name: string | null;
  routine_id: number | null;
}

interface RoutineData {
  id: number;
  name: string;
  description: string | null;
  completedToday?: boolean;
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MiembroDashboardPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const userId = session.user?.id || session.id || session.userId;
  const userEmail = session.user?.email || "";

  // 0. Sincronización de respaldo si el usuario regresa tras pagar en Mercado Pago
  const resolvedSearchParams = await searchParams;
  const paymentId = resolvedSearchParams?.payment_id || resolvedSearchParams?.collection_id;
  const collectionStatus = resolvedSearchParams?.collection_status || resolvedSearchParams?.status;

  if (paymentId && collectionStatus === "approved") {
    try {
      // Validar directamente contra Mercado Pago
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
        cache: 'no-store' // IMPORTANTE: Para evitar respuestas cacheadas de la API
      });

      if (mpRes.ok) {
        const paymentData = await mpRes.json();
        
        if (paymentData.status === "approved") {
          const rawRef = paymentData.external_reference;
          let memberId: number | null = null;
          let tenantId: string | null = null;

          if (rawRef) {
            try {
              const parsed = typeof rawRef === 'string' ? JSON.parse(rawRef) : rawRef;
              memberId = Number(parsed.memberId);
              tenantId = parsed.tenantId;
            } catch (e) {
              console.error("Error parseando external_reference:", e);
            }
          }

          if (memberId && !isNaN(memberId)) {
            const newEndDate = new Date();
            newEndDate.setDate(newEndDate.getDate() + 30);

            // 1. Activar miembro
            await sql`
              UPDATE members
              SET status = 'active', updated_at = NOW()
              WHERE id = ${memberId}
            `;

            // 2. Activar suscripción (Si no existe, crear la fila)
            const subCheck = await sql`
              SELECT id FROM subscriptions WHERE member_id = ${memberId} LIMIT 1
            `;

            if (Array.isArray(subCheck) && subCheck.length > 0) {
              await sql`
                UPDATE subscriptions
                SET 
                  status = 'active',
                  start_date = NOW(),
                  end_date = ${newEndDate.toISOString()},
                  updated_at = NOW()
                WHERE member_id = ${memberId}
              `;
            } else {
              // Si por alguna razón no tenía suscripción creada previa
              await sql`
                INSERT INTO subscriptions (tenant_id, member_id, status, start_date, end_date, created_at, updated_at)
                VALUES (${tenantId || 'gym-default'}, ${memberId}, 'active', NOW(), ${newEndDate.toISOString()}, NOW(), NOW())
              `;
            }

            console.log(`[SYNC FRONTEND] Miembro #${memberId} reactivado exitosamente.`);

            // REDIRECCIONAR A /miembro SIN QUERY PARAMS
            // Esto limpia los datos de la URL y fuerza un render completamente limpio con estado activo
            redirect("/miembro");
          }
        }
      }
    } catch (err) {
      // Ignoramos el error si fue provocado por el propio redirect() de Next.js
      if ((err as any)?.digest?.startsWith("NEXT_REDIRECT")) {
        throw err;
      }
      console.error("Error al sincronizar pago de retorno:", err);
    }
  }


  let memberData: MemberDashboardData | null = null;
  let assignedRoutines: RoutineData[] = [];

  try {
    // 1. Obtener datos del miembro y su suscripción más reciente
    const result = await sql`
      SELECT 
        m.id,
        m.first_name,
        m.last_name,
        m.status AS member_status,
        m.routine_id,
        s.start_date,
        s.end_date,
        s.status AS sub_status,
        mp.name AS plan_name
      FROM members m
      LEFT JOIN users u ON m.user_id = u.id OR LOWER(m.email) = LOWER(u.email)
      LEFT JOIN subscriptions s ON m.id = s.member_id
      LEFT JOIN membership_plans mp ON s.plan_id = mp.id
      WHERE m.user_id = ${userId} 
         OR u.id = ${userId}
         OR LOWER(m.email) = LOWER(${userEmail})
      ORDER BY s.updated_at DESC, s.end_date DESC
      LIMIT 1
    `;

    const rows = Array.isArray(result) ? result : (result as any).rows || [];
    memberData = (rows[0] as MemberDashboardData) || null;

    // 2. Si se encontró el miembro, obtenemos las rutinas y entrenamientos completados HOY
    if (memberData) {
      const [routineResult, completedTodayLogs] = await Promise.all([
        sql`
          SELECT r.id, COALESCE(r.title, 'Rutina Asignada') as name, r.notes as description
          FROM routines r
          INNER JOIN member_routines mr ON mr.routine_id = r.id
          WHERE mr.member_id = ${memberData.id}
          
          UNION

          SELECT r.id, COALESCE(r.title, 'Rutina Asignada') as name, r.notes as description
          FROM routines r
          WHERE r.id = ${memberData.routine_id || -1}
        `,
        sql`
          SELECT DISTINCT routine_id 
          FROM workout_logs 
          WHERE member_id = ${memberData.id} 
            AND completed_at::date = CURRENT_DATE
        `.catch((err) => {
          console.error("Error al consultar logs:", err);
          return [];
        })
      ]);

      const routineRows = Array.isArray(routineResult) ? routineResult : (routineResult as any).rows || [];
      const completedRows = Array.isArray(completedTodayLogs) ? completedTodayLogs : (completedTodayLogs as any).rows || [];
      
      const completedRoutineIds = new Set(completedRows.map((c: any) => c.routine_id));

      assignedRoutines = routineRows.map((raw: any) => {
        let cleanDescription = "Ingresá para ver las series, repeticiones y descansos asignados.";

        if (typeof raw.description === "string" && raw.description.trim()) {
          if (!raw.description.trim().startsWith("[")) {
            cleanDescription = raw.description;
          } else {
            try {
              const parsed = JSON.parse(raw.description);
              if (Array.isArray(parsed) && parsed.length > 0) {
                cleanDescription = `Incluye ${parsed.length} ${parsed.length === 1 ? "ejercicio" : "ejercicios"} configurados.`;
              }
            } catch (e) {
              // Si falla el parseo se mantiene la descripción por defecto
            }
          }
        }

        return {
          id: raw.id,
          name: raw.name,
          description: cleanDescription,
          completedToday: completedRoutineIds.has(raw.id),
        };
      });
    }
  } catch (error) {
    console.error("Error al obtener datos del dashboard del miembro:", error);
  }

  // Evaluación del estado real de la membresía
  const isSuspended = 
    memberData?.sub_status === "suspended" || 
    memberData?.sub_status === "inactive" ||
    (memberData as any)?.member_status === "suspended" ||
    (memberData as any)?.member_status === "inactive";
  
  let daysRemaining = 0;
  let isExpired = true;

  if (memberData?.end_date) {
    const today = new Date();
    const endDate = new Date(memberData.end_date);
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    const diffTime = endDate.getTime() - today.getTime();
    daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    isExpired = endDate < today;
  }

  // La suscripción está totalmente activa sólo si no está vencida Y su estado no es suspended/inactive
  const isFullyActive = !isExpired && !isSuspended && memberData?.sub_status === "active";

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-6">
      {/* Saludo y bienvenida */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          ¡Hola, {memberData?.first_name || "Atleta"}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Bienvenido a tu panel general de FitZone.
        </p>
      </div>

      {/* Tarjetas de Resumen Rápido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 1. Estado del Plan */}
        <div className="bg-card text-card-foreground border rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Suscripción
            </span>
            {isFullyActive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" /> Activa
              </span>
            ) : isSuspended ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                <AlertTriangle className="w-3.5 h-3.5" /> Suspendida
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
                <AlertTriangle className="w-3.5 h-3.5" /> Vencida / Sin Plan
              </span>
            )}
          </div>

          <div>
            <h3 className="text-xl font-bold text-foreground">
              {memberData?.plan_name || "Sin Plan Asignado"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {isFullyActive 
                ? "Tenés acceso completo a las instalaciones" 
                : "Regularizá tu cuota para volver a entrenar"}
            </p>
          </div>

          <Link 
            href="/miembro/membresia"
            className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline pt-2"
          >
            Ver estado completo <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 2. Días Restantes */}
        <div className="bg-card text-card-foreground border rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Vencimiento
            </span>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-foreground">
                {isSuspended || isExpired ? 0 : daysRemaining}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                días restantes
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {memberData?.end_date 
                ? `Vence el ${new Date(memberData.end_date).toLocaleDateString("es-AR", { timeZone: "UTC" })}`
                : "Sin fecha registrada"}
            </p>
          </div>

          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full ${
                isSuspended || isExpired 
                  ? 'bg-red-500' 
                  : daysRemaining > 5 
                    ? 'bg-emerald-500' 
                    : 'bg-amber-500'
              }`}
              style={{ width: `${isSuspended || isExpired ? 100 : Math.min(100, (daysRemaining / 30) * 100)}%` }}
            />
          </div>
        </div>

        {/* 3. Perfil y Accesos */}
        <div className="bg-card text-card-foreground border rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mi Cuenta
            </span>
            <User className="w-4 h-4 text-muted-foreground" />
          </div>

          <div>
            <h3 className="text-base font-bold text-foreground">
              {memberData?.first_name} {memberData?.last_name}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Mantené actualizados tus datos de contacto y salud.
            </p>
          </div>

          <Link
            href="/miembro/perfil"
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 text-xs font-medium border border-border bg-muted/50 hover:bg-muted text-foreground rounded-lg transition-colors"
          >
            Gestionar Perfil
          </Link>
        </div>

      </div>

      {/* Tarjeta de Rutinas Asignadas */}
      <div className="bg-card text-card-foreground border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <Dumbbell className="w-5 h-5 text-primary" />
            <span>Mis Rutinas de Entrenamiento</span>
          </div>
          {isFullyActive && assignedRoutines.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              {assignedRoutines.length} {assignedRoutines.length === 1 ? "Rutina Asignada" : "Rutinas Asignadas"}
            </span>
          )}
        </div>

        {!isFullyActive ? (
          /* Bloqueo por cuenta suspendida o vencida */
          <div className="p-6 rounded-xl bg-red-500/5 border border-red-500/20 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/10 text-red-500 rounded-lg">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-foreground text-sm">Acceso bloqueado a las rutinas</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Aboná tu cuota para reactivar tu membresía y visualizar los planes de entrenamiento.
                </p>
              </div>
            </div>
            <Link
              href="/miembro/membresia"
              className="px-4 py-2 text-xs font-semibold bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors whitespace-nowrap shadow-sm"
            >
              Pagar Cuota
            </Link>
          </div>
        ) : assignedRoutines.length > 0 ? (
          <div className="space-y-3 pt-1">
            {assignedRoutines.map((routine) => {
              const nameLower = routine.name.toLowerCase();
              const isWarmup = nameLower.includes("calor") || nameLower.includes("entrada") || nameLower.includes("calentamiento");

              return (
                <div 
                  key={routine.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/20 border border-border hover:border-primary/40 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        isWarmup 
                          ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" 
                          : "bg-primary/10 text-primary border border-primary/20"
                      }`}>
                        {isWarmup ? <Flame className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                        {isWarmup ? "Entrada en calor" : "Rutina Principal"}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-foreground">
                      {routine.name}
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-xl">
                      {routine.description}
                    </p>
                  </div>

                  {routine.completedToday ? (
                    <Link
                      href={`/miembro/rutina?id=${routine.id}`}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 transition-colors whitespace-nowrap shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Realizada
                    </Link>
                  ) : (
                    <Link
                      href={`/miembro/rutina?id=${routine.id}`}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-primary-foreground bg-primary rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Iniciar Rutina
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-4 text-center sm:text-left">
            <p className="text-sm font-medium text-foreground">Sin rutina asignada</p>
            <p className="text-xs text-muted-foreground mt-1">
              Aún no tenés una rutina de entrenamiento activa. Consultá con tu entrenador para que te asigne un plan en lote o personalizado.
            </p>
          </div>
        )}
      </div>

      {/* Banner promocional / Aviso del Gimnasio */}
      <div className="bg-muted/40 border border-border rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg text-primary">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm">
              ¿Querés registrar un nuevo pago o consultar tu historial?
            </h4>
            <p className="text-xs text-muted-foreground">
              Revisá las transacciones anteriores y el desglose de tu membresía.
            </p>
          </div>
        </div>
        <Link
          href="/miembro/membresia"
          className="px-4 py-2 text-xs font-semibold border rounded-lg hover:bg-muted transition-colors whitespace-nowrap"
        >
          Ir a Membresía
        </Link>
      </div>
    </div>
  );
}