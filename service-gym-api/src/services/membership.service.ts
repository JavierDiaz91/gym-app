import { sql } from "../db/neon";

export async function getGymPlans(gymId: number) {
  return await sql`
    SELECT id, name, price, duration_months, is_active, description
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
    VALUES (${data.gymId}, ${data.name}, ${data.price}, ${data.durationMonths}, ${data.description || ""}, true)
    RETURNING *
  `;
  return newPlan;
}

export async function updateGymPlan(id: number, data: {
  name: string;
  price: number;
  durationMonths: number;
  description?: string;
  isActive: boolean;
}) {
  const [updated] = await sql`
    UPDATE membership_plans
    SET name = ${data.name},
        price = ${data.price},
        duration_months = ${data.durationMonths},
        description = ${data.description || ""},
        is_active = ${data.isActive},
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return updated;
}

export async function deleteGymPlan(id: number) {
  // Desactivación lógica (Soft Delete)
  const [disabled] = await sql`
    UPDATE membership_plans
    SET is_active = false, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return disabled;
}

export async function assignSubscription(data: {
  memberId: number;
  planId: number;
  durationMonths: number;
}) {
  // Desactivamos suscripciones previas si las hubiera
  await sql`
    UPDATE subscriptions
    SET status = 'inactive'
    WHERE member_id = ${data.memberId} AND status = 'active'
  `;

  // Creamos la nueva suscripción activa
  const [sub] = await sql`
    INSERT INTO subscriptions (member_id, plan_id, start_date, end_date, status)
    VALUES (
      ${data.memberId},
      ${data.planId},
      NOW(),
      NOW() + (${data.durationMonths} || ' month')::INTERVAL,
      'active'
    )
    RETURNING *
  `;

  return sub;
}

export async function assignMembershipToMember(memberId: number, membershipId: number) {
  // 1. Obtener la duración de la membresía para calcular el vencimiento
  const membershipResult = await sql`
    SELECT id, name, duration_days FROM memberships WHERE id = ${membershipId};
  `;
  
  const membership = membershipResult[0];
  if (!membership) throw new Error("Membresía no encontrada");

  const durationDays = membership.duration_days || 30; // 30 días por defecto

  // 2. Insertar o actualizar la relación en la tabla de miembros / suscripciones
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + durationDays);

  const result = await sql`
    UPDATE members
    SET membership_id = ${membershipId},
        membership_status = 'active',
        start_date = ${startDate.toISOString()},
        end_date = ${endDate.toISOString()},
        updated_at = NOW()
    WHERE id = ${memberId}
    RETURNING *;
  `;

  return result[0];
}