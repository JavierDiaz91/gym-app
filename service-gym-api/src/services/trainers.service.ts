import { sql } from "../db/neon";

export async function getTrainers(gymId: number) {
  return await sql`
    SELECT id, first_name, last_name, specialization
    FROM trainers
    WHERE is_active = true
      AND gym_id = ${gymId}
  `;
}

export async function getTrainerMembers(gymId: number, trainerId: number) {
  return await sql`
    SELECT 
      m.id,
      m.first_name,
      m.last_name,
      m.status
    FROM trainer_members tm
    JOIN trainers t ON tm.trainer_id = t.id
    JOIN members m ON tm.member_id = m.id
    WHERE tm.trainer_id = ${trainerId}
      AND t.gym_id = ${gymId}
      AND m.gym_id = ${gymId}
  `;
}
