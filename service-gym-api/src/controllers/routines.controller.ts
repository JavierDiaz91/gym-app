import { Request, Response } from "express";
import { createRoutine } from "../services/routines.service";
import { getRoutinesByTrainer } from "../services/routines.service";

export async function createRoutineController(
  req: Request,
  res: Response
) {
  try {
    const { trainerId, title} = req.body;

    if (!trainerId || !title) {
      return res.status(400).json({
        message: "trainerId y title son obligatorios",
      });
    }

    const routine = await createRoutine(
      Number(trainerId),
      title,
      
    );

    res.status(201).json(routine);
  } catch (error) {
    console.error("Error creating routine:", error);
    res.status(500).json({
      message: "Error al crear rutina",
    });
  }
}

export async function getRoutines(req: Request, res: Response) {
  const trainerId = Number(req.query.trainerId);

  if (!trainerId) {
    return res.status(400).json({
      error: "trainerId es requerido"
    });
  }

  const routines = await getRoutinesByTrainer(trainerId);
  res.json(routines);
}

export async function createRoutineHandler(
  req: Request,
  res: Response
) {
  const { trainerId, title } = req.body;

  if (!trainerId || !title) {
    return res.status(400).json({
      error: "trainerId y title son obligatorios",
    });
  }

  const routine = await createRoutine(trainerId, title);
  res.status(201).json(routine);
}