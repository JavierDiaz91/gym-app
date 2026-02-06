// types/routine.ts
export interface RoutineExercise {
  id: number;
  name: string;
  day: number;
  sets: number;
  reps: number;
}

export interface MemberRoutine {
  id: number;
  name: string;
  description: string | null;
  exercises: RoutineExercise[];
}

