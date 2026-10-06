import { sql } from "../db/neon";
import { Member } from "../types/member";

// ==================== GET ALL ====================
export async function getAllMembers(): Promise<Member[]> {
  const result = await sql`
    SELECT 
      id,
      user_id,
      first_name,
      last_name,
      phone,
      status,
      join_date
    FROM members
    ORDER BY created_at DESC
  `;

  return result as unknown as Member[];
}

// ==================== GET BY ID ====================
export async function getMemberById(id: number): Promise<Member | null> {
  const result = await sql`
    SELECT 
      id,
      user_id,
      first_name,
      last_name,
      phone,
      status,
      join_date
    FROM members
    WHERE id = ${id}
  `;

  return (result[0] as Member) ?? null;
}

// ==================== CREATE ====================
export async function createMember(
  data: Pick<Member, "user_id" | "first_name" | "last_name"> &
    Partial<Pick<Member, "phone" | "status">>
): Promise<Member> {
  const result = await sql`
    INSERT INTO members (
      user_id,
      first_name,
      last_name,
      phone,
      status
    )
    VALUES (
      ${data.user_id},
      ${data.first_name},
      ${data.last_name},
      ${data.phone ?? null},
      ${data.status ?? "active"}
    )
    RETURNING
      id,
      user_id,
      first_name,
      last_name,
      phone,
      status,
      join_date
  `;

  return result[0] as Member;
}

// ==================== UPDATE ====================
export async function updateMember(
  id: number,
  data: Partial<Pick<Member, "first_name" | "last_name" | "phone" | "status">>
): Promise<Member | null> {
  const result = await sql`
    UPDATE members
    SET
      first_name = COALESCE(${data.first_name}, first_name),
      last_name  = COALESCE(${data.last_name}, last_name),
      phone      = COALESCE(${data.phone}, phone),
      status     = COALESCE(${data.status}, status)
    WHERE id = ${id}
    RETURNING
      id,
      user_id,
      first_name,
      last_name,
      phone,
      status,
      join_date
  `;

  return (result[0] as Member) ?? null;
}

// ==================== DELETE ====================
export async function deleteMember(id: number): Promise<void> {
  await sql`DELETE FROM members WHERE id = ${id}`;
}


export async function createGymMember(data: {
  gymId: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  emergencyContact?: string;
  planId?: number;
}) {
  // 1. Crear el miembro
  const [member] = await sql`
    INSERT INTO members (gym_id, first_name, last_name, email, phone, emergency_contact)
    VALUES (${data.gymId}, ${data.firstName}, ${data.lastName}, ${data.email || null}, ${data.phone || null}, ${data.emergencyContact || null})
    RETURNING *
  `;

  // 2. Si se seleccionó un plan, crear su suscripción inicial (30 días)
  if (data.planId) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    await sql`
      INSERT INTO subscriptions (member_id, plan_id, start_date, end_date, status)
      VALUES (${member.id}, ${data.planId}, ${startDate.toISOString()}, ${endDate.toISOString()}, 'active')
    `;
  }

  return member;
}


export async function getMemberProfile(memberId: number) {
  const result = await sql`
    SELECT 
      m.id,
      m.first_name,
      m.last_name,
      m.email,
      m.status,
      s.start_date,
      s.end_date,
      mp.name AS plan_name,
      mp.price AS plan_price
    FROM members m
    LEFT JOIN subscriptions s ON s.member_id = m.id
    LEFT JOIN memberships mp ON s.membership_id = mp.id
    WHERE m.id = ${memberId}
    ORDER BY s.created_at DESC
    LIMIT 1;
  `;

  return result[0];
}

export async function getMemberDashboard(memberId: number) {
  const result = await sql`
    SELECT 
      m.id,
      m.first_name,
      m.last_name,
      m.email,
      m.status AS member_status,
      s.start_date,
      s.end_date,
      s.status AS subscription_status,
      mp.name AS plan_name,
      mp.price AS plan_price
    FROM members m
    LEFT JOIN subscriptions s ON s.member_id = m.id AND s.status = 'active'
    LEFT JOIN memberships mp ON s.membership_id = mp.id
    WHERE m.id = ${memberId}
    ORDER BY s.created_at DESC
    LIMIT 1;
  `;

  return result[0];
}