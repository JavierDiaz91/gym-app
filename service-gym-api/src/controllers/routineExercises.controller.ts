import { Request, Response } from "express";
import { addExerciseToRoutine } from "../services/routineExercises.service";

export async function createRoutineExercise(req: Request, res: Response) {
  try {
    const {
      routineId,
      exerciseId,
      sets,
      reps,
      restSeconds,
      weight
    } = req.body;

    const routineExercise = await addExerciseToRoutine({
      routineId,
      exerciseId,
      sets,
      reps,
      restSeconds,
      weight
    });

    res.status(201).json(routineExercise);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error al agregar ejercicio a la rutina",
      error
    });
  }
}


