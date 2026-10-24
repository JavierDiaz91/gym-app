"use server";

import { sql } from "@/lib/db";
import { getSession } from "@/app/actions";
import { revalidatePath } from "next/cache";

export type TrainerExercise = {
  id: number; name: string; instructions: string; imageUrl: string;
  muscleGroup: string; equipment: string;
};
export type ExerciseInput = Omit<TrainerExercise, "id">;

async function owner() {
  const session = await getSession();
  if (!session || session.role !== "trainer" || session.gymId == null) throw new Error("No autorizado");
  const rows = await sql`SELECT id FROM trainers WHERE user_id = ${session.id} AND gym_id = ${session.gymId} AND is_active IS DISTINCT FROM FALSE LIMIT 1`;
  if (!rows.length) throw new Error("Entrenador no habilitado");
  return { gymId: Number(session.gymId), trainerId: Number(rows[0].id) };
}

export async function listTrainerExercises(): Promise<TrainerExercise[]> {
  const { gymId, trainerId } = await owner();
  const rows = await sql`SELECT id, name, instructions, image_url, muscle_group, equipment
    FROM trainer_exercise_library WHERE gym_id = ${gymId} AND trainer_id = ${trainerId} AND is_active = TRUE
    ORDER BY name LIMIT 1000`;
  return rows.map(x => ({
    id: Number(x.id), name: String(x.name), instructions: String(x.instructions || ""),
    imageUrl: String(x.image_url || ""), muscleGroup: String(x.muscle_group || ""),
    equipment: String(x.equipment || "")
  }));
}

export async function saveTrainerExercise(input: ExerciseInput, id?: number): Promise<{success: boolean; error?: string}> {
  try {
    const { gymId, trainerId } = await owner();
    const name = input.name?.trim() || "";
    const instructions = input.instructions?.trim() || "";
    const imageUrl = input.imageUrl?.trim() || "";
    const muscleGroup = input.muscleGroup?.trim() || "";
    const equipment = input.equipment?.trim() || "";
    if (!name || name.length > 150 || instructions.length > 2000 || imageUrl.length > 2000 ||
        (imageUrl && !/^https:\/\//i.test(imageUrl)) || muscleGroup.length > 100 || equipment.length > 100)
      return { success: false, error: "Revisá el nombre, los textos y la URL HTTPS de la imagen." };
    if (id !== undefined) {
      if (!Number.isInteger(id) || id <= 0) return { success: false, error: "ID inválido" };
      const updated = await sql`UPDATE trainer_exercise_library SET
        name = ${name}, instructions = ${instructions}, image_url = ${imageUrl || null},
        muscle_group = ${muscleGroup}, equipment = ${equipment}, updated_at = NOW()
        WHERE id = ${id} AND gym_id = ${gymId} AND trainer_id = ${trainerId} AND is_active = TRUE RETURNING id`;
      if (!updated.length) return { success: false, error: "Ejercicio no encontrado" };
    } else {
      await sql`INSERT INTO trainer_exercise_library
        (gym_id, trainer_id, name, instructions, image_url, muscle_group, equipment)
        VALUES (${gymId}, ${trainerId}, ${name}, ${instructions}, ${imageUrl || null}, ${muscleGroup}, ${equipment})`;
    }
    revalidatePath("/trainer/ejercicios");
    revalidatePath("/trainer/rutinas/planes");
    return { success: true };
  } catch (error) {
    console.error("Error guardando ejercicio", error);
    return { success: false, error: "No se pudo guardar. Verificá que la migración esté aplicada y que el nombre no esté repetido." };
  }
}

export async function archiveTrainerExercise(id: number): Promise<{success: boolean; error?: string}> {
  try {
    if (!Number.isInteger(id) || id <= 0) return {success:false,error:"ID inválido"};
    const { gymId, trainerId } = await owner();
    const rows = await sql`UPDATE trainer_exercise_library SET is_active = FALSE, updated_at = NOW()
      WHERE id = ${id} AND gym_id = ${gymId} AND trainer_id = ${trainerId} AND is_active = TRUE RETURNING id`;
    if (!rows.length) return {success:false,error:"Ejercicio no encontrado"};
    revalidatePath("/trainer/ejercicios");
    revalidatePath("/trainer/rutinas/planes");
    return {success:true};
  } catch { return {success:false,error:"No se pudo archivar"}; }
}
