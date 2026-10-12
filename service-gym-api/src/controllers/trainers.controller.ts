import { Response } from "express";
import * as trainersService from "../services/trainers.service";
import { AuthenticatedRequest, getRequestGymId } from "../middlewares/auth";

function resolveGymId(req: AuthenticatedRequest): number | null {
  return getRequestGymId(req, req.query.gymId ?? req.body?.gymId);
}

export const getTrainers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const gymId = resolveGymId(req);
    if (!gymId) {
      res.status(400).json({ error: "gymId requerido" });
      return;
    }

    const trainers = await trainersService.getTrainers(gymId);
    res.json(trainers);
  } catch (error) {
    console.error("Error en getTrainers:", error);
    res.status(500).json({ error: "Error al obtener los entrenadores" });
  }
};

export const getTrainerById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const gymId = resolveGymId(req);
    if (!gymId) {
      res.status(400).json({ error: "gymId requerido" });
      return;
    }

    const { id } = req.params;
    const trainers = await trainersService.getTrainers(gymId);
    const trainer = trainers.find((t: any) => Number(t.id) === Number(id));

    if (!trainer) {
      res.status(404).json({ error: "Entrenador no encontrado" });
      return;
    }

    res.json(trainer);
  } catch (error) {
    console.error("Error en getTrainerById:", error);
    res.status(500).json({ error: "Error al obtener el entrenador" });
  }
};
