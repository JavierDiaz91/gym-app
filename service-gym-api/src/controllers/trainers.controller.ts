import { Request, Response } from "express";
import * as trainersService from "../services/trainers.service";

// Obtener todos los entrenadores
export const getTrainers = async (req: Request, res: Response): Promise<void> => {
  try {
    // Usamos el método real de tu servicio
    const trainers = await trainersService.getTrainers();
    res.json(trainers);
  } catch (error) {
    console.error("Error en getTrainers:", error);
    res.status(500).json({ error: "Error al obtener los entrenadores" });
  }
};

// Obtener un entrenador por ID
export const getTrainerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Traemos la lista y filtramos por ID acá en el controlador
    const trainers = await trainersService.getTrainers();
    const trainer = trainers.find((t: any) => t.id === Number(id) || t.id === id);
    
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