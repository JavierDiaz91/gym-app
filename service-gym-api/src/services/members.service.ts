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
