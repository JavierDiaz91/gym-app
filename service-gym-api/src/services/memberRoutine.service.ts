import { sql } from "../db/neon";

export async function getRoutineByMember(memberId: number) {
  const result = await sql`
    SELECT
      r.id AS routine_id,
      r.title,
      e.name AS exercise,
      re.sets,
      re.reps,
      re.weight,
      re.rest_seconds
    FROM member_routines mr
    JOIN routines r ON mr.routine_id = r.id
    JOIN routine_exercises re ON r.id = re.routine_id
    JOIN exercises e ON re.exercise_id = e.id
    WHERE mr.member_id = ${memberId}
    ORDER BY re.id
  `;

  return result;
}
