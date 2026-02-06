import { sql } from "../db/neon";

export async function assignRoutineToMember(
  memberId: number,
  routineId: number
) {
  // Evitar duplicados
  const existing = await sql`
    SELECT id
    FROM member_routines
    WHERE member_id = ${memberId}
      AND routine_id = ${routineId}
  `;

  if (existing.length > 0) {
    throw new Error("La rutina ya está asignada a este miembro");
  }

  const result = await sql`
    INSERT INTO member_routines (
      member_id,
      routine_id
    )
    VALUES (
      ${memberId},
      ${routineId}
    )
    RETURNING *
  `;

  return result[0];
}

export async function getRoutineByMember(memberId: number) {
  return await sql`
    SELECT
      r.id            AS routine_id,
      r.title         AS routine_title,
      e.id            AS exercise_id,
      e.name          AS exercise_name,
      re.sets,
      re.reps,
      re.rest_seconds,
      re.weight
    FROM member_routines mr
    JOIN routines r ON mr.routine_id = r.id
    JOIN routine_exercises re ON r.id = re.routine_id
    JOIN exercises e ON re.exercise_id = e.id
    WHERE mr.member_id = ${memberId}
    ORDER BY re.id
  `;
}
