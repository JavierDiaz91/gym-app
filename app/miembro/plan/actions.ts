"use server";
import { sql } from "@/lib/db";
import { getSession } from "@/app/actions";

async function memberContext() {
  const session = await getSession();
  if (!session || session.role !== "member" || session.gymId == null) throw new Error("No autorizado");
  const rows = await sql`SELECT id FROM members WHERE user_id = ${session.id} AND gym_id = ${session.gymId} LIMIT 1`;
  if (!rows.length) throw new Error("Alumno no encontrado");
  return { memberId: Number(rows[0].id), gymId: Number(session.gymId) };
}
export async function getMyTrainingPlan() {
  const { memberId, gymId } = await memberContext();
  const rows = await sql`
    SELECT id, snapshot_jsonb, start_date, source_version
    FROM member_training_plans
    WHERE member_id = ${memberId} AND gym_id = ${gymId} AND status = 'active'
      AND CURRENT_DATE >= start_date
      AND CURRENT_DATE < start_date + (COALESCE((SELECT GREATEST(1, duration_weeks) FROM training_plans WHERE id = source_plan_id AND gym_id = ${gymId}), 4) * 7)
    ORDER BY assigned_at DESC, id DESC LIMIT 1
  `;
  if (!rows.length) return null;
  return { id: Number(rows[0].id), snapshot: rows[0].snapshot_jsonb,
    startDate: String(rows[0].start_date), version: Number(rows[0].source_version) };
}
export async function saveMyTrainingSet(planId: number, dayIndex: number, weekNumber: number,
  itemKey: string, setIndex: number, reps: number | null, load: number | null) {
  try {
    const { memberId, gymId } = await memberContext();
    if (!Number.isSafeInteger(planId) || !Number.isInteger(dayIndex) || dayIndex < 1 || dayIndex > 7 ||
      !Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 52 ||
      !Number.isInteger(setIndex) || setIndex < 1 || setIndex > 100 ||
      typeof itemKey !== "string" || itemKey.length > 100 ||
      (reps !== null && (!Number.isInteger(reps) || reps < 0 || reps > 10000)) ||
      (load !== null && (!Number.isFinite(load) || load < 0 || load > 100000))) {
      return { success: false, error: "Valores inválidos" };
    }
    const plans = await sql`SELECT snapshot_jsonb FROM member_training_plans
      WHERE id = ${planId} AND member_id = ${memberId} AND gym_id = ${gymId} AND status = 'active'`;
    if (!plans.length) return { success: false, error: "Plan no disponible" };
    const draft = plans[0].snapshot_jsonb as { days?: { blocks?: { items?: { key: string; prescriptions?: unknown[] }[] }[] }[] };
    const day = draft.days?.[dayIndex - 1];
    const item = day?.blocks?.flatMap((b) => b.items || []).find((x) => x.key === itemKey);
    if (!item || weekNumber > (item.prescriptions?.length || 0))
      return { success: false, error: "Ejercicio o semana no válido" };
    // Atomic upsert: creates session if needed and logs the set.
    await sql`
      WITH session_row AS (
        INSERT INTO workout_sessions (member_training_plan_id, member_id, day_index, week_number)
        VALUES (${planId}, ${memberId}, ${dayIndex}, ${weekNumber})
        ON CONFLICT (member_training_plan_id, day_index, week_number)
        DO UPDATE SET started_at = workout_sessions.started_at
        RETURNING id
      )
      INSERT INTO workout_set_logs (workout_session_id, item_snapshot_key, set_index, actual_reps, actual_load)
      SELECT id, ${itemKey}, ${setIndex}, ${reps}, ${load} FROM session_row
      ON CONFLICT (workout_session_id, item_snapshot_key, set_index)
      DO UPDATE SET actual_reps = EXCLUDED.actual_reps, actual_load = EXCLUDED.actual_load
    `;
    return { success: true };
  } catch { return { success: false, error: "No se pudo registrar la serie" }; }
}
