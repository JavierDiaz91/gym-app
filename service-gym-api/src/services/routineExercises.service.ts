// services/routineExercises.service.ts
import { sql } from "../db/neon";

type AddRoutineExerciseInput = {
  routineId: number;
  exerciseId: number;
  sets: number;
  reps: number;
  restSeconds?: number;
  weight?: string;
};

export async function addExerciseToRoutine(data: AddRoutineExerciseInput) {
  const result = await sql`
    INSERT INTO routine_exercises (
      routine_id,
      exercise_id,
      sets,
      reps,
      rest_seconds,
      weight
    )
    VALUES (
      ${data.routineId},
      ${data.exerciseId},
      ${data.sets},
      ${data.reps},
      ${data.restSeconds ?? null},
      ${data.weight ?? null}
    )
    RETURNING *
  `;

  return result[0];
}
