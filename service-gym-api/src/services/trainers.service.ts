import { sql } from "../db/neon";

export async function getTrainers() {
  return await sql`
    SELECT id, first_name, last_name, specialization
    FROM trainers
    WHERE is_active = true
  `;
}

export async function getTrainerMembers(trainerId: number) {
  return await sql`
    SELECT 
      m.id,
      m.first_name,
      m.last_name,
      m.status
    FROM trainer_members tm
    JOIN members m ON tm.member_id = m.id
    WHERE tm.trainer_id = ${trainerId}
  `;
}
