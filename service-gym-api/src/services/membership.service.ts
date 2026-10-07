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
  const [member] = await sql`
    SELECT id
    FROM members
    WHERE id = ${data.memberId}
      AND gym_id = ${data.gymId}
  `;
  if (!member) throw new Error("Miembro no encontrado");

  const [plan] = await sql`
    SELECT id
    FROM membership_plans
    WHERE id = ${data.planId}
      AND gym_id = ${data.gymId}
      AND is_active = true
  `;
  if (!plan) throw new Error("Plan no encontrado");

  await sql`
    UPDATE subscriptions
    SET status = 'inactive'
    WHERE member_id = ${data.memberId}
      AND status = 'active'
  `;

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

export async function assignMembershipToMember(
  gymId: number,
  memberId: number,
  membershipId: number
) {
  const [member] = await sql`
    SELECT id
    FROM members
    WHERE id = ${memberId}
      AND gym_id = ${gymId}
  `;
  if (!member) throw new Error("Miembro no encontrado");

  const membershipResult = await sql`
    SELECT id, name, duration_days
    FROM memberships
    WHERE id = ${membershipId}
  `;

  const membership = membershipResult[0];
  if (!membership) throw new Error("Membresía no encontrada");

  const durationDays = membership.duration_days || 30;
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + durationDays);

  const result = await sql`
    UPDATE members
    SET
      membership_id = ${membershipId},
      membership_status = 'active',
      start_date = ${startDate.toISOString()},
      end_date = ${endDate.toISOString()},
      updated_at = NOW()
    WHERE id = ${memberId}
      AND gym_id = ${gymId}
    RETURNING *
  `;

  return result[0];
}
