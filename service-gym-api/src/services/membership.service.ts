import { sql } from "../db/neon";

export async function getGymPlans(gymId: number) {
  return await sql`
    SELECT id, name, price, duration_months, is_active, description
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
    description?: string;
    isActive?: boolean;
  }
) {
  validatePlanFields(data);
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
      AND (access_mode = 'monthly' OR ${data.isActive !== true})
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
