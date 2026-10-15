import { sql } from "../db/neon";
import { Member } from "../types/member";

export async function getAllMembers(gymId: number): Promise<Member[]> {
  const result = await sql`
    SELECT id, user_id, first_name, last_name, phone, status, join_date
    FROM members
    WHERE gym_id = ${gymId}
    ORDER BY created_at DESC
  `;
  return result as unknown as Member[];
}

export async function getMemberById(gymId: number, id: number): Promise<Member | null> {
  const result = await sql`
    SELECT id, user_id, first_name, last_name, phone, status, join_date
    FROM members
    WHERE id = ${id}
      AND gym_id = ${gymId}
  `;
  return (result[0] as Member) ?? null;
}

export async function createMember(
  gymId: number,
  data: Pick<Member, "user_id" | "first_name" | "last_name"> &
    Partial<Pick<Member, "phone" | "status">>
): Promise<Member> {
  const result = await sql`
    INSERT INTO members (gym_id, user_id, first_name, last_name, phone, status)
    VALUES (
      ${gymId},
      ${data.user_id},
      ${data.first_name},
      ${data.last_name},
      ${data.phone ?? null},
      ${data.status ?? "active"}
    )
    RETURNING id, user_id, first_name, last_name, phone, status, join_date
  `;
  return result[0] as Member;
}

export async function updateMember(
  gymId: number,
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
      AND gym_id = ${gymId}
    RETURNING id, user_id, first_name, last_name, phone, status, join_date
  `;
  return (result[0] as Member) ?? null;
}

export async function deleteMember(gymId: number, id: number): Promise<boolean> {
  const result = await sql`
    DELETE FROM members
    WHERE id = ${id}
      AND gym_id = ${gymId}
    RETURNING id
  `;
  return result.length > 0;
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
  const [result] = await sql`
    SELECT public.create_gym_member_with_plan(
      ${data.gymId},
      ${data.firstName},
      ${data.lastName},
      ${data.email ?? null},
      ${data.phone ?? null},
      ${data.emergencyContact ?? null},
      ${data.planId ?? null}
    ) AS member_id
  `;
  const [member] = await sql`
    SELECT * FROM members
    WHERE id = ${result.member_id} AND gym_id = ${data.gymId}
  `;
  return member;
}

export async function getMemberProfile(gymId: number, memberId: number) {
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
    LEFT JOIN membership_plans mp ON s.plan_id = mp.id
    WHERE m.id = ${memberId}
      AND m.gym_id = ${gymId}
    ORDER BY s.created_at DESC
    LIMIT 1
  `;
  return result[0];
}

export async function getMemberDashboard(gymId: number, memberId: number) {
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
    LEFT JOIN membership_plans mp ON s.plan_id = mp.id
    WHERE m.id = ${memberId}
      AND m.gym_id = ${gymId}
    ORDER BY s.created_at DESC
    LIMIT 1
  `;
  return result[0];
}
