import { sql } from "../db/neon";
import { Routine } from "../types/routine";

export async function createRoutine(
  trainerId: number,
  title: string
): Promise<Routine> {
  const result = await sql`
    INSERT INTO routines (
      trainer_id,
      title
    )
    VALUES (
      ${trainerId},
      ${title}
    )
    RETURNING
      id,
      trainer_id,
      title,
      created_at
  `;

  return result[0] as Routine;
}

export async function getRoutinesByTrainer(
  trainerId: number
): Promise<Routine[]> {
  const result = await sql`
    SELECT
      id,
      trainer_id,
      title,
      created_at
    FROM routines
    WHERE trainer_id = ${trainerId}
    ORDER BY created_at DESC
  `;

  return result as Routine[];
}
