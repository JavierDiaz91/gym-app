import { sql } from "../db/neon";

export async function getGymPlans(gymId: number) {
  return await sql`
    SELECT id, name, price, duration_months, is_active, description,
           access_mode, duration_days, max_entries
    FROM membership_plans
    WHERE gym_id = ${gymId}
    ORDER BY created_at DESC
  `;
}

function validatePlanFields(data: { name?: string; price?: number; durationMonths?: number }) {
  if (data.name !== undefined && !data.name.trim()) {
    throw new Error("El nombre del plan es obligatorio.");
  }
  if (data.price !== undefined && (!Number.isFinite(data.price) || data.price < 0)) {
    throw new Error("El precio del plan debe ser un numero valido no negativo.");
  }
  if (data.durationMonths !== undefined &&
      (!Number.isInteger(data.durationMonths) || data.durationMonths < 1)) {
    throw new Error("La duracion del plan debe ser un numero entero de meses mayor a cero.");
  }
}

export async function createGymPlan(data: {
  gymId: number;
  name: string;
  price: number;
  durationMonths: number;
  description?: string;
}) {
  validatePlanFields(data);
  const [newPlan] = await sql`
    INSERT INTO membership_plans (gym_id, name, price, duration_months, description, is_active)
    VALUES (
      ${data.gymId},
      ${data.name},
      ${data.price},
      ${data.durationMonths},
      ${data.description || ""},
      true
    )
    RETURNING *
  `;
  return newPlan;
}


export type FlexibleAccessMode = "fixed_days" | "entry_pack";

// Se guardan como borradores inactivos: la venta y el cobro aun no soportan
// estas modalidades. Requiere migracion de membership_plans aplicada en dev.
export async function createFlexibleGymPlanDraft(data: {
  gymId: number;
  name: string;
  price: number;
  accessMode: FlexibleAccessMode;
  durationDays: number;
  maxEntries?: number;
  description?: string;
}) {
  if (!Number.isInteger(data.gymId) || data.gymId <= 0) {
    throw new Error("Gimnasio invalido.");
  }
  if (!data.name?.trim() || !Number.isFinite(data.price) || data.price < 0) {
    throw new Error("Nombre o precio de plan invalido.");
  }
  if (!["fixed_days", "entry_pack"].includes(data.accessMode)) {
    throw new Error("Modalidad de acceso invalida.");
  }
  if (!Number.isInteger(data.durationDays) || data.durationDays < 1) {
    throw new Error("La vigencia debe ser un numero entero positivo de dias.");
  }
  if (data.accessMode === "entry_pack" &&
      (!Number.isInteger(data.maxEntries) || (data.maxEntries ?? 0) < 1)) {
    throw new Error("El paquete debe tener una cantidad positiva de ingresos.");
  }
  if (data.accessMode === "fixed_days" && data.maxEntries !== undefined) {
    throw new Error("Un pase por dias no admite limite de ingresos.");
  }

  const [plan] = await sql`
    INSERT INTO membership_plans (
      gym_id, name, price, duration_months, description, is_active,
      access_mode, duration_days, max_entries
    ) VALUES (
      ${data.gymId}, ${data.name.trim()}, ${data.price}, 1,
      ${data.description ?? ""}, false,
      ${data.accessMode}, ${data.durationDays},
      ${data.accessMode === "entry_pack" ? data.maxEntries! : null}
    )
    RETURNING *
  `;
  return plan;
}

export async function updateGymPlan(
  gymId: number,
  id: number,
  data: {
    name?: string;
    price?: number;
    durationMonths?: number;
    durationDays?: number;
    maxEntries?: number;
    description?: string;
    isActive?: boolean;
  }
) {
  validatePlanFields(data);
  if (data.durationDays !== undefined &&
      (!Number.isInteger(data.durationDays) || data.durationDays < 1)) {
    throw new Error("La vigencia debe ser un numero entero positivo.");
  }
  if (data.maxEntries !== undefined &&
      (!Number.isInteger(data.maxEntries) || data.maxEntries < 1)) {
    throw new Error("La cantidad de ingresos debe ser positiva.");
  }
  const [existing] = await sql`
    SELECT access_mode, is_active FROM membership_plans
    WHERE id = ${id} AND gym_id = ${gymId}
  `;
  if (!existing) return undefined;
  const mode = String(existing.access_mode);
  if (mode === "monthly") {
    if (data.durationDays !== undefined || data.maxEntries !== undefined) {
      throw new Error("Un plan mensual no admite campos de pase flexible.");
    }
  } else if (mode === "fixed_days" || mode === "entry_pack") {
    if (data.durationMonths !== undefined) {
      throw new Error("No se puede cambiar la duracion mensual de un pase flexible.");
    }
    if (mode === "fixed_days" && data.maxEntries !== undefined) {
      throw new Error("El pase por dias no admite limite de ingresos.");
    }
    if (data.isActive === true) {
      throw new Error("La activacion de pases flexibles requiere validacion del flujo de cobro.");
    }
    // No cambiar condiciones de pases ya adquiridos: suscripciones referencian el plan.
    if (data.durationDays !== undefined || data.maxEntries !== undefined) {
      const [used] = await sql`
        SELECT 1 FROM subscriptions WHERE plan_id = ${id} LIMIT 1
      `;
      if (used) {
        throw new Error("El plan ya tiene suscripciones. Crea otro plan para cambiar vigencia o ingresos.");
      }
    }
  } else {
    throw new Error("Modalidad de plan desconocida.");
  }
  const [updated] = await sql`
    UPDATE membership_plans
    SET
      name = COALESCE(${data.name ?? null}, name),
      price = COALESCE(${data.price ?? null}, price),
      duration_months = COALESCE(${data.durationMonths ?? null}, duration_months),
      duration_days = COALESCE(${data.durationDays ?? null}, duration_days),
      max_entries = COALESCE(${data.maxEntries ?? null}, max_entries),
      description = COALESCE(${data.description ?? null}, description),
      is_active = CASE WHEN access_mode = 'monthly'
        THEN COALESCE(${data.isActive ?? null}, is_active)
        ELSE false END,
      updated_at = NOW()
    WHERE id = ${id} AND gym_id = ${gymId}
      AND (access_mode = 'monthly' OR is_active = false)
      AND (
        (access_mode = 'monthly' AND ${data.durationDays === undefined} AND ${data.maxEntries === undefined})
        OR (access_mode = 'fixed_days' AND ${data.durationMonths === undefined} AND ${data.maxEntries === undefined})
        OR (access_mode = 'entry_pack' AND ${data.durationMonths === undefined})
      )
      AND (
        (${data.durationDays === undefined} AND ${data.maxEntries === undefined})
        OR NOT EXISTS (SELECT 1 FROM subscriptions WHERE plan_id = ${id})
      )
    RETURNING *
  `;
  return updated;
}

export async function deleteGymPlan(gymId: number, id: number) {
  const [disabled] = await sql`
    UPDATE membership_plans
    SET is_active = false, updated_at = NOW()
    WHERE id = ${id}
      AND gym_id = ${gymId}
    RETURNING *
  `;
  return disabled;
}

export async function assignSubscription(data: {
  gymId: number;
  memberId: number;
  planId: number;
  durationMonths: number;
}) {
  if (!Number.isInteger(data.gymId) || data.gymId <= 0 ||
      !Number.isInteger(data.memberId) || data.memberId <= 0 ||
      !Number.isInteger(data.planId) || data.planId <= 0) {
    throw new Error("Gimnasio, socio o plan invalido.");
  }
  // Hasta habilitar la venta de pases flexibles, el flujo legacy solo
  // admite planes mensuales activos. Esta verificacion NO reemplaza la
  // validacion atomica dentro de renew_gym_membership en la base.
  const [plan] = await sql`
    SELECT id FROM membership_plans
    WHERE id = ${data.planId} AND gym_id = ${data.gymId}
      AND is_active = true AND access_mode = 'monthly'
    LIMIT 1
  `;
  if (!plan) {
    throw new Error("Este plan no esta habilitado para la renovacion mensual.");
  }
  // The database function owns duration, dates, tenant checks and locking.
  // This entry point only schedules the renewal; it does not collect a payment.
  const [sub] = await sql`
    SELECT * FROM public.renew_gym_membership(
      ${data.gymId}, ${data.memberId}, ${data.planId}, 'pending', 0
    )
  `;
  return sub;
}


export async function recordFlexiblePassPaymentInDev(data: {
  gymId: number;
  memberId: number;
  planId: number;
  paymentMethod: string;
  transactionId: string;
  amount: number;
  notes?: string;
}) {
  // Fail closed: a deployment must explicitly opt into this experimental path.
  if (process.env.NODE_ENV === "production" ||
      process.env.ENABLE_FLEXIBLE_PASS_DEV !== "true") {
    throw new Error("Venta de pases flexibles deshabilitada.");
  }
  if (![data.gymId, data.memberId, data.planId].every(
    value => Number.isSafeInteger(value) && value > 0
  ) || !Number.isFinite(data.amount) || data.amount <= 0 ||
      !data.paymentMethod?.trim() || !data.transactionId?.trim()) {
    throw new Error("Datos del pago incompletos o invalidos.");
  }
  // Solo cobros presenciales ya confirmados por un administrador.
  // NO usar con pagos MP pendientes ni con webhooks.
  const rows = await sql`
    SELECT * FROM public.record_flexible_gym_pass_payment_draft(
      ${data.gymId}, ${data.memberId}, ${data.planId},
      ${data.paymentMethod.trim()}, ${data.transactionId.trim()},
      ${data.amount}, ${data.notes ?? null}
    )
  `;
  return rows[0] ?? null;
}
