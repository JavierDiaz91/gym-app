"use server";

import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/app/actions";

export type PlanInput = {
  title: string;
  description: string;
  durationWeeks: number;
  discipline: string;
  objective: string;
  level: string;
  audience: string;
};

const allowed: Record<string, string[]> = {
  discipline: ["musculacion", "running", "funcional", "movilidad", "preparacion_fisica"],
  objective: ["fuerza", "hipertrofia", "resistencia", "potencia", "movilidad"],
  level: ["principiante", "intermedio", "avanzado"],
  audience: ["todos", "mujeres", "hombres"],
};

async function trainerContext() {
  const session = await getSession();
  if (!session || session.role !== "trainer" || session.gymId == null) throw new Error("No autorizado");
  const trainers = await sql`
    SELECT id FROM trainers
    WHERE user_id = ${session.id} AND gym_id = ${session.gymId} AND is_active IS DISTINCT FROM FALSE
    LIMIT 1
  `;
  if (!trainers.length) throw new Error("Entrenador no habilitado para este gimnasio");
  return { gymId: Number(session.gymId), trainerId: Number(trainers[0].id) };
}

export async function listTrainingPlans() {
  const { gymId, trainerId } = await trainerContext();
  const plans = await sql`
    SELECT id, title, description, duration_weeks, status, version, created_at
    FROM training_plans
    WHERE gym_id = ${gymId} AND trainer_id = ${trainerId}
    ORDER BY created_at DESC, id DESC
  `;
  return plans.map((p) => ({
    id: Number(p.id), title: String(p.title), description: String(p.description || ""),
    durationWeeks: Number(p.duration_weeks), status: String(p.status), version: Number(p.version),
  }));
}

export async function createTrainingPlan(input: PlanInput): Promise<{ success: boolean; error?: string }> {
  try {
    const { gymId, trainerId } = await trainerContext();
    const title = input.title?.trim();
    const description = input.description?.trim() || "";
    const duration = Number(input.durationWeeks);
    if (!title || title.length > 150 || description.length > 2000 ||
        !Number.isInteger(duration) || duration < 1 || duration > 52) {
      return { success: false, error: "Título o duración inválidos" };
    }
    const choices: Array<[string, string]> = [
      ["discipline", input.discipline], ["objective", input.objective],
      ["level", input.level], ["audience", input.audience],
    ];
    if (choices.some(([dim, value]) => !allowed[dim].includes(value))) {
      return { success: false, error: "Categoría inválida" };
    }
    // A single SQL statement guarantees atomic plan+category insertion.
    // Categories must already exist in training_categories (global or gym-local).
    const categoryRows = await sql`
      SELECT id, dimension, slug FROM training_categories
      WHERE is_active = TRUE AND (gym_id IS NULL OR gym_id = ${gymId})
    `;
    const categoryIds = choices.map(([dim, slug]) =>
      categoryRows.find((c) => c.dimension === dim && c.slug === slug)?.id
    );
    if (categoryIds.some((id) => id == null)) {
      return { success: false, error: "Faltan categorías iniciales en la base. Ejecutar la migración y su seed primero." };
    }
    const ids = categoryIds.map(Number);
    await sql`
      WITH inserted AS (
        INSERT INTO training_plans (gym_id, trainer_id, title, description, duration_weeks)
        VALUES (${gymId}, ${trainerId}, ${title}, ${description}, ${duration})
        RETURNING id
      )
      INSERT INTO training_plan_categories (plan_id, category_id)
      SELECT inserted.id, categories.id
      FROM inserted CROSS JOIN unnest(${ids}::bigint[]) AS categories(id)
    `;
    revalidatePath("/trainer/rutinas/planes");
    return { success: true };
  } catch (error) {
    console.error("Error creando plan", error);
    return { success: false, error: "No se pudo crear el plan. Comprobá que la migración esté aplicada." };
  }
}
