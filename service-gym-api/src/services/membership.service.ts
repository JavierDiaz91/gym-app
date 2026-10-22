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

export async function createGymPlan(data: {
  gymId: number;
  name: string;
  price: number;
  durationMonths: number;
  description?: string;
}) {
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

// Draft only: never expose newly created flexible plans for sale.
export async function createFlexibleGymPlanDraft(data: {
  gymId: number;
  name: string;
  price: number;
  accessMode: FlexibleAccessMode;
  durationDays: number;
  maxEntries?: number;
  description?: string;
}) {
  if (!Number.isInteger(data.gymId) || data.gymId <= 0) throw new Error("Gimnasio invalido.");
  if (typeof data.name !== "string" || !data.name.trim() || !Number.isFinite(data.price) || data.price < 0)
    throw new Error("Nombre o precio de plan invalido.");
  if (data.accessMode !== "fixed_days" && data.accessMode !== "entry_pack")
    throw new Error("Modalidad de acceso invalida.");
  if (!Number.isInteger(data.durationDays) || data.durationDays < 1)
    throw new Error("La vigencia debe ser un numero entero positivo de dias.");
  if (data.accessMode === "entry_pack" && (!Number.isInteger(data.maxEntries) || (data.maxEntries ?? 0) < 1))
    throw new Error("El paquete debe tener una cantidad positiva de ingresos.");
  if (data.accessMode === "fixed_days" && data.maxEntries !== undefined)
    throw new Error("Un pase por dias no admite limite de ingresos.");

  const [plan] = await sql`
    INSERT INTO membership_plans (
      gym_id, name, price, duration_months, description, is_active,
      access_mode, duration_days, max_entries
    ) VALUES (
      ${data.gymId}, ${data.name.trim()}, ${data.price}, 1,
      ${data.description ?? ""}, false,
      ${data.accessMode}, ${data.durationDays},
      ${data.accessMode === "entry_pack" ? data.maxEntries! : null}
    ) RETURNING *
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
    description?: string;
    isActive?: boolean;
  }
) {
  const [updated] = await sql`
    UPDATE membership_plans
    SET
      name = COALESCE(${data.name ?? null}, name),
      price = COALESCE(${data.price ?? null}, price),
      duration_months = COALESCE(${data.durationMonths ?? null}, duration_months),
      description = COALESCE(${data.description ?? null}, description),
      is_active = COALESCE(${data.isActive ?? null}, is_active),
      updated_at = NOW()
    WHERE id = ${id}
      AND gym_id = ${gymId}
      AND (${data.isActive === true} = false OR COALESCE(access_mode, 'monthly') NOT IN ('entry_pack', 'fixed_days'))
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
  // The database function owns duration, dates, tenant checks and locking.
  // This entry point only schedules the renewal; it does not collect a payment.
  const [sub] = await sql`
    SELECT * FROM public.renew_gym_membership(
      ${data.gymId}, ${data.memberId}, ${data.planId}, 'pending', 0
    )
  `;
  return sub;
}

/**
 * Record an already-confirmed in-person payment for a flexible pass.
 * The PostgreSQL function owns locking, tenant validation, plan price,
 * idempotency, subscription creation and payment insertion.
 */
export async function recordFlexibleInPersonPayment(data: {
  gymId: number;
  memberId: number;
  planId: number;
  paymentMethod: "cash" | "transfer";
  transactionId: string;
  amount: number;
  notes?: string;
}) {
  // Fail closed until the complete rollout is explicitly approved.
  if (process.env.ENABLE_FLEXIBLE_PASS_SALES !== "true") {
    throw new Error("Venta presencial de pases flexibles deshabilitada.");
  }
  if (![data.gymId, data.memberId, data.planId].every(
    (value) => Number.isSafeInteger(value) && value > 0
  )) {
    throw new Error("Identificadores invalidos.");
  }
  if (data.paymentMethod !== "cash" && data.paymentMethod !== "transfer") {
    throw new Error("Solo se admite efectivo o transferencia confirmada.");
  }
  if (typeof data.transactionId !== "string" ||
      !data.transactionId.trim() || data.transactionId.trim().length > 120) {
    throw new Error("Referencia unica del pago obligatoria (maximo 120 caracteres).");
  }
  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    throw new Error("Monto invalido.");
  }
  if (data.notes !== undefined &&
      (typeof data.notes !== "string" || data.notes.length > 1000)) {
    throw new Error("Notas invalidas.");
  }
  const [result] = await sql`
    SELECT payment_id, subscription_id
    FROM public.record_flexible_gym_pass_payment_draft(
      ${data.gymId}, ${data.memberId}, ${data.planId},
      ${data.paymentMethod}, ${data.transactionId.trim()},
      ${data.amount}, ${data.notes?.trim() || null}
    )
  `;
  if (!result) throw new Error("No se pudo registrar el pago.");
  return result;
}
