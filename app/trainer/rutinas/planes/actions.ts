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

const dimensions = ["discipline", "objective", "level", "audience"] as const;


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
    if (choices.some(([dim, value]) => !dimensions.includes(dim as typeof dimensions[number]) || !value || value.length > 100)) {
      return { success: false, error: "Categoría inválida" };
    }
    // A single SQL statement guarantees atomic plan+category insertion.
    // Categories must already exist in training_categories (global or gym-local).
    const categoryRows = await sql`
      SELECT id, dimension, slug FROM training_categories
      WHERE is_active = TRUE AND gym_id = ${gymId} AND trainer_id = ${trainerId}
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

export type Prescription = {
  sets?: number; reps?: string; rir?: string; restSeconds?: number; tempo?: string;
  distanceMeters?: number; durationSeconds?: number; pace?: string; notes?: string;
};
export type PlanItem = { key: string; title: string; imageUrl?: string; instructions?: string; prescriptions: Prescription[] };
export type PlanBlock = { title: string; type: "warmup" | "main" | "circuit" | "cooldown" | "custom"; items: PlanItem[] };
export type PlanDay = { title: string; modality: "strength" | "running" | "mixed" | "mobility" | "other"; blocks: PlanBlock[] };
export type PlanDraft = { days: PlanDay[] };

function validDraft(draft: PlanDraft, weeks: number) {
  if (!draft || !Array.isArray(draft.days) || draft.days.length > 7) return false;
  return draft.days.every((day) =>
    typeof day.title === "string" && day.title.length <= 150 &&
    ["strength","running","mixed","mobility","other"].includes(day.modality) &&
    Array.isArray(day.blocks) && day.blocks.length <= 20 &&
    day.blocks.every((block) => typeof block.title === "string" && block.title.length <= 150 &&
      ["warmup","main","circuit","cooldown","custom"].includes(block.type) &&
      Array.isArray(block.items) && block.items.length <= 60 &&
      block.items.every((item) =>
        typeof item.key === "string" && item.key.length <= 100 &&
        typeof item.title === "string" && item.title.trim().length > 0 && item.title.length <= 150 &&
        (!item.imageUrl || (/^https:\/\//.test(item.imageUrl) && item.imageUrl.length <= 2000)) &&
        (!item.instructions || item.instructions.length <= 2000) &&
        Array.isArray(item.prescriptions) && item.prescriptions.length === weeks &&
        item.prescriptions.every((p) =>
          (!p.sets || (Number.isInteger(p.sets) && p.sets > 0 && p.sets <= 100)) &&
          (!p.restSeconds || (Number.isInteger(p.restSeconds) && p.restSeconds >= 0)) &&
          (!p.distanceMeters || (Number.isInteger(p.distanceMeters) && p.distanceMeters >= 0)) &&
          (!p.durationSeconds || (Number.isInteger(p.durationSeconds) && p.durationSeconds >= 0))
        )
      )
    )
  );
}
export async function getTrainingPlan(id: number) {
  const { gymId, trainerId } = await trainerContext();
  const rows = await sql`
    SELECT id, title, duration_weeks, status, draft_jsonb
    FROM training_plans WHERE id = ${id} AND gym_id = ${gymId} AND trainer_id = ${trainerId}
    LIMIT 1
  `;
  if (!rows.length) throw new Error("Plan no encontrado");
  return { id: Number(rows[0].id), title: String(rows[0].title), durationWeeks: Number(rows[0].duration_weeks),
    status: String(rows[0].status), draft: rows[0].draft_jsonb as PlanDraft };
}
export async function saveTrainingPlanDraft(id: number, draft: PlanDraft) {
  try {
    const { gymId, trainerId } = await trainerContext();
    const rows = await sql`SELECT duration_weeks FROM training_plans WHERE id = ${id}
      AND gym_id = ${gymId} AND trainer_id = ${trainerId} AND status = 'draft' LIMIT 1`;
    if (!rows.length) return { success: false, error: "Sólo se editan borradores propios" };
    if (!validDraft(draft, Number(rows[0].duration_weeks))) return { success: false, error: "Plan inválido" };
    await sql`UPDATE training_plans SET draft_jsonb = ${JSON.stringify(draft)}::jsonb, updated_at = NOW()
      WHERE id = ${id} AND gym_id = ${gymId} AND trainer_id = ${trainerId} AND status = 'draft'`;
    revalidatePath("/trainer/rutinas/planes");
    return { success: true };
  } catch { return { success: false, error: "No se pudo guardar" }; }
}
export async function publishTrainingPlan(id: number) {
  try {
    const { gymId, trainerId } = await trainerContext();
    const rows = await sql`SELECT duration_weeks, draft_jsonb FROM training_plans
      WHERE id = ${id} AND gym_id = ${gymId} AND trainer_id = ${trainerId} AND status = 'draft'`;
    if (!rows.length) return { success: false, error: "Plan no encontrado" };
    const draft = rows[0].draft_jsonb as PlanDraft;
    if (!validDraft(draft, Number(rows[0].duration_weeks)) || draft.days.length === 0 ||
        draft.days.every((d) => d.blocks.every((b) => b.items.length === 0)))
      return { success: false, error: "Agregá al menos un ejercicio antes de publicar" };
    await sql`UPDATE training_plans SET status = 'published', updated_at = NOW()
      WHERE id = ${id} AND gym_id = ${gymId} AND trainer_id = ${trainerId} AND status = 'draft'`;
    revalidatePath("/trainer/rutinas/planes");
    return { success: true };
  } catch { return { success: false, error: "No se pudo publicar" }; }
}
export async function duplicateTrainingPlan(id: number) {
  try {
    const { gymId, trainerId } = await trainerContext();
    const rows = await sql`
      INSERT INTO training_plans (gym_id, trainer_id, title, description, duration_weeks, draft_jsonb, source_plan_id, version)
      SELECT gym_id, trainer_id, title || ' (copia)', description, duration_weeks, draft_jsonb, id, version + 1
      FROM training_plans WHERE id = ${id} AND gym_id = ${gymId} AND trainer_id = ${trainerId}
      RETURNING id`;
    if (!rows.length) return { success: false, error: "Plan no encontrado" };
    revalidatePath("/trainer/rutinas/planes");
    return { success: true, id: Number(rows[0].id) };
  } catch { return { success: false, error: "No se pudo duplicar" }; }
}
export async function listTrainerPlanMembers() {
  const { gymId, trainerId } = await trainerContext();
  const rows = await sql`SELECT id, first_name, last_name FROM members
    WHERE gym_id = ${gymId} AND trainer_id = ${trainerId} ORDER BY first_name, last_name`;
  return rows.map((m) => ({ id: Number(m.id), name: String(m.first_name) + " " + String(m.last_name) }));
}
export async function assignTrainingPlan(planId: number, memberId: number, customization?: PlanDraft) {
  try {
    const { gymId, trainerId } = await trainerContext();
    const plans = await sql`SELECT id, version, duration_weeks, draft_jsonb FROM training_plans
      WHERE id = ${planId} AND gym_id = ${gymId} AND trainer_id = ${trainerId} AND status = 'published'`;
    const members = await sql`SELECT id FROM members WHERE id = ${memberId} AND gym_id = ${gymId}
      AND trainer_id = ${trainerId} LIMIT 1`;
    if (!plans.length || !members.length) return { success: false, error: "Plan o alumno no autorizado" };
    const existing = await sql`
      SELECT id FROM member_training_plans
      WHERE gym_id = ${gymId} AND trainer_id = ${trainerId}
        AND member_id = ${memberId} AND source_plan_id = ${planId}
        AND status = 'active'
      LIMIT 1
    `;
    if (existing.length) return { success: false, error: "El alumno ya tiene este plan activo. No se creó otra asignación." };
    const snapshot = customization ?? (plans[0].draft_jsonb as PlanDraft);
    if (!validDraft(snapshot, Number(plans[0].duration_weeks))) return { success: false, error: "Personalización inválida" };
    await sql`INSERT INTO member_training_plans
      (gym_id, member_id, trainer_id, source_plan_id, source_version, start_date, snapshot_jsonb)
      VALUES (${gymId}, ${memberId}, ${trainerId}, ${planId}, ${Number(plans[0].version)},
      (date_trunc('month', (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires') + INTERVAL '1 month'))::date, ${JSON.stringify(snapshot)}::jsonb)`;
    revalidatePath("/miembro/rutina");
    return { success: true };
  } catch { return { success: false, error: "No se pudo asignar" }; }
}

export async function updateAssignedPlanStartDate(assignmentId: number, memberId: number, dateInput: string) {
  try {
    const { gymId, trainerId } = await trainerContext();
    if (!Number.isSafeInteger(assignmentId) || assignmentId <= 0 || !Number.isSafeInteger(memberId) || memberId <= 0 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return { success: false, error: "Fecha o asignación inválida." };
    }
    const parsed = new Date(dateInput + "T00:00:00Z");
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== dateInput) {
      return { success: false, error: "Ingresá una fecha válida." };
    }
    // Solo la asignación propia; no modificar plantillas ni registros históricos.
    const rows = await sql`
      UPDATE member_training_plans mtp
      SET start_date = ${dateInput}::date
      WHERE mtp.id = ${assignmentId} AND mtp.member_id = ${memberId}
        AND mtp.gym_id = ${gymId} AND mtp.trainer_id = ${trainerId}
        AND mtp.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM workout_sessions ws
          WHERE ws.member_training_plan_id = mtp.id
        )
      RETURNING mtp.id
    `;
    if (!rows.length) return { success: false, error: "No se puede cambiar la fecha: verificá la asignación o si ya tiene entrenamientos registrados." };
    revalidatePath("/trainer/alumnos");
    revalidatePath("/miembro");
    revalidatePath("/miembro/rutina");
    return { success: true };
  } catch {
    return { success: false, error: "No se pudo actualizar la fecha de inicio." };
  }
}

export async function listExerciseImages() {
  await trainerContext();
  const rows = await sql`SELECT id, name, image_url FROM exercises ORDER BY name LIMIT 500`;
  return rows.map((x) => ({ id: Number(x.id), name: String(x.name), imageUrl: String(x.image_url || "") }));
}


export async function listEnabledTrainingCategories() {
 const {gymId,trainerId}=await trainerContext();
 const rows=await sql`
 SELECT c.dimension,c.slug,c.label
 FROM training_categories c
 WHERE c.is_active=TRUE AND c.gym_id=${gymId} AND c.trainer_id=${trainerId}
 ORDER BY c.dimension,c.label
 `;
 return rows.map(r=>({dimension:String(r.dimension),slug:String(r.slug),label:String(r.label)}));
}

export async function createTrainerCategory(dimension: string, labelInput: string) {
  try {
    const { gymId, trainerId } = await trainerContext();
    const label = labelInput.trim().replace(/\\s+/g, " ");
    if (!dimensions.includes(dimension as typeof dimensions[number]) || label.length < 2 || label.length > 80)
      return { success: false, error: "Ingresá un nombre de 2 a 80 caracteres." };
    const existing = await sql`SELECT id FROM training_categories
      WHERE gym_id=${gymId} AND trainer_id=${trainerId} AND dimension=${dimension}
      AND lower(label)=lower(${label}) LIMIT 1`;
    if (existing.length) return { success: false, error: "Ya tenés una categoría con ese nombre." };
    const slug = "trainer-" + trainerId + "-" + dimension + "-" + crypto.randomUUID();
    await sql`INSERT INTO training_categories (gym_id, trainer_id, dimension, slug, label, is_active)
      VALUES (${gymId}, ${trainerId}, ${dimension}, ${slug}, ${label}, TRUE)`;
    revalidatePath("/trainer/rutinas/planes");
    revalidatePath("/trainer/mis-categorias");
    return { success: true };
  } catch (error) {
    console.error("Error creando categoría de entrenador", error);
    return { success: false, error: "No se pudo crear la categoría. Verificá que la migración 010 esté aplicada." };
  }
}

export async function setTrainerCategoryActive(slug: string, active: boolean) {
  try {
    const { gymId, trainerId } = await trainerContext();
    const rows = await sql`UPDATE training_categories SET is_active=${active}
      WHERE gym_id=${gymId} AND trainer_id=${trainerId} AND slug=${slug}
      RETURNING id`;
    if (!rows.length) return { success: false, error: "Categoría no encontrada" };
    revalidatePath("/trainer/rutinas/planes");
    revalidatePath("/trainer/mis-categorias");
    return { success: true };
  } catch { return { success: false, error: "No se pudo actualizar la categoría" }; }
}

export async function listTrainerCategoriesForManagement() {
  const { gymId, trainerId } = await trainerContext();
  const rows = await sql`SELECT dimension, slug, label, is_active FROM training_categories
    WHERE gym_id=${gymId} AND trainer_id=${trainerId}
    ORDER BY dimension, label`;
  return rows.map(r => ({ dimension: String(r.dimension), slug: String(r.slug), label: String(r.label), active: Boolean(r.is_active) }));
}
