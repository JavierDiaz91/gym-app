import { Request, Response } from "express";
import { assignRoutineToMember } from "../services/memberRoutines.service";
import { getRoutineByMember } from "../services/memberRoutine.service";

export async function createMemberRoutine(req: Request, res: Response) {
  try {
    const { memberId, routineId } = req.body;

    if (!memberId || !routineId) {
      return res.status(400).json({
        message: "memberId y routineId son obligatorios",
      });
    }

    const result = await assignRoutineToMember(memberId, routineId);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({
      message: error.message || "Error al asignar rutina",
    });
  }
}

export async function getMemberRoutine(req: Request, res: Response) {
  const memberId = Number(req.params.id);

  if (isNaN(memberId)) {
    return res.status(400).json({ message: "ID inválido" });
  }

  const rows = await getRoutineByMember(memberId);

  if (rows.length === 0) {
    return res.status(404).json({
      message: "El miembro no tiene rutina asignada"
    });
  }

  // 🔥 Agrupamos
  const routine = {
    id: rows[0].routine_id,
    title: rows[0].title,
    exercises: rows.map(r => ({
      name: r.exercise,
      sets: r.sets,
      reps: r.reps,
      weight: r.weight,
      rest_seconds: r.rest_seconds
    }))
  };

  res.json(routine);
}
