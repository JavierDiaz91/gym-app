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


/**
 * Explicit, fail-closed activation for flexible plans.
 * This feature must remain disabled until the dedicated sale flow is approved.
 */
export async function activateFlexibleGymPlan(gymId: number, planId: number) {
  if (process.env.ENABLE_FLEXIBLE_PASS_ACTIVATION !== "true") {
    throw new Error("Activacion de pases flexibles no habilitada.");
  }
  if (!Number.isSafeInteger(gymId) || gymId <= 0 ||
      !Number.isSafeInteger(planId) || planId <= 0) {
    throw new Error("Identificadores invalidos.");
  }
  // One SQL statement: validate eligibility and change state atomically.
  const [plan] = await sql`
    UPDATE public.membership_plans AS p
    SET is_active = true, updated_at = NOW()
    WHERE p.id = ${planId}
      AND p.gym_id = ${gymId}
      AND p.is_active = false
      AND p.access_mode IN ('fixed_days', 'entry_pack')
      AND p.duration_days IS NOT NULL AND p.duration_days > 0
      AND p.price IS NOT NULL AND p.price > 0
      AND (
        (p.access_mode = 'fixed_days' AND p.max_entries IS NULL)
        OR (p.access_mode = 'entry_pack' AND p.max_entries IS NOT NULL AND p.max_entries > 0)
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.subscriptions AS s WHERE s.plan_id = p.id
      )
    RETURNING p.*
  `;
  if (!plan) throw new Error("Plan no apto para activacion o no encontrado.");
  return plan;
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
