"use server";

import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function memberContext(assignmentId: number, week: number, day: number) {
  const session = await getSession();
  if (!session || session.role !== "member" || session.gymId == null) throw new Error("No autorizado");
  if (![assignmentId, week, day].every(Number.isSafeInteger) || assignmentId < 1 || week < 1 || day < 1) throw new Error("Parámetros inválidos");
  const rows = await sql`
    SELECT mtp.id, mtp.snapshot_jsonb, tp.duration_weeks
    FROM member_training_plans mtp
    JOIN members m ON m.id = mtp.member_id AND m.gym_id = mtp.gym_id
    LEFT JOIN training_plans tp ON tp.id = mtp.source_plan_id AND tp.gym_id = mtp.gym_id
    WHERE mtp.id = ${assignmentId} AND mtp.gym_id = ${session.gymId}
      AND m.user_id = ${session.id} AND mtp.status = 'active'
    LIMIT 1
  `;
  if (!rows.length) throw new Error("Plan no asignado");
  const days = rows[0].snapshot_jsonb?.days;
  const weeks = Number(rows[0].duration_weeks) || 4;
  if (!Array.isArray(days) || day > days.length || week > weeks) throw new Error("Semana o día inválido");
  return { memberId: Number((await sql`SELECT id FROM members WHERE user_id = ${session.id} AND gym_id = ${session.gymId} LIMIT 1`)[0].id), days };
}

type Result = { success: boolean; error?: string };
export async function startPlanSession(assignmentId: number, week: number, day: number): Promise<Result> {
  try {
    const { memberId } = await memberContext(assignmentId, week, day);
    const rows = await sql`
      INSERT INTO workout_sessions (member_training_plan_id, member_id, week_number, day_index, status)
      VALUES (${assignmentId}, ${memberId}, ${week}, ${day}, 'in_progress')
      ON CONFLICT (member_training_plan_id, day_index, week_number) DO NOTHING
      RETURNING id
    `;
    if (!rows.length) return { success: false, error: "Esta sesión ya fue iniciada o finalizada." };
    revalidatePath("/miembro/rutina");
    return { success: true };
  } catch (e) { return { success: false, error: e instanceof Error ? e.message : "No se pudo iniciar" }; }
}

export async function markPlanExercise(assignmentId: number, week: number, day: number, key: string, completed: boolean): Promise<Result> {
  try {
    const { memberId, days } = await memberContext(assignmentId, week, day);
    if (!key || key.length > 100 || !days[day - 1].blocks?.some((b: {items?: {key: string}[]}) => b.items?.some(i => i.key === key))) throw new Error("Ejercicio inválido");
    if (completed) {
      const rows = await sql`
        INSERT INTO workout_set_logs (workout_session_id, item_snapshot_key, set_index, notes)
        SELECT ws.id, ${key}, 1, 'completed'
        FROM workout_sessions ws
        WHERE ws.member_training_plan_id = ${assignmentId} AND ws.member_id = ${memberId}
          AND ws.week_number = ${week} AND ws.day_index = ${day} AND ws.status = 'in_progress'
        ON CONFLICT (workout_session_id, item_snapshot_key, set_index)
        DO UPDATE SET notes = 'completed'
        RETURNING id
      `;
      if (!rows.length) return { success: false, error: "Iniciá la sesión antes de marcar ejercicios." };
    } else {
      await sql`
        DELETE FROM workout_set_logs wsl USING workout_sessions ws
        WHERE wsl.workout_session_id = ws.id AND wsl.item_snapshot_key = ${key}
          AND wsl.set_index = 1 AND wsl.notes = 'completed'
          AND ws.member_training_plan_id = ${assignmentId} AND ws.member_id = ${memberId}
          AND ws.week_number = ${week} AND ws.day_index = ${day} AND ws.status = 'in_progress'
      `;
    }
    revalidatePath("/miembro/rutina");
    return { success: true };
  } catch (e) { return { success: false, error: e instanceof Error ? e.message : "No se pudo registrar" }; }
}

type ActualSet = { reps?: number | null; load?: number | null; rir?: number | null };
export async function saveActualSet(assignmentId: number, week: number, day: number, key: string, setIndex: number, actual: ActualSet): Promise<Result> {
  try {
    const { memberId, days } = await memberContext(assignmentId, week, day);
    const item = days[day - 1].blocks?.flatMap((b: { items?: { key: string; prescriptions?: { sets?: number }[] }[] }) => b.items || []).find((i: { key: string }) => i.key === key);
    const maxSets = Math.max(1, Math.min(30, Number(item?.prescriptions?.[week - 1]?.sets) || 1));
    if (!item || !key || key.length > 100 || !Number.isSafeInteger(setIndex) || setIndex < 1 || setIndex > maxSets) throw new Error("Serie inválida");
    const reps = actual.reps ?? null, load = actual.load ?? null, rir = actual.rir ?? null;
    if (reps !== null && (!Number.isSafeInteger(reps) || reps < 0 || reps > 1000)) throw new Error("Repeticiones inválidas");
    if (load !== null && (!Number.isFinite(load) || load < 0 || load > 10000)) throw new Error("Peso inválido");
    if (rir !== null && (!Number.isFinite(rir) || rir < 0 || rir > 30)) throw new Error("RIR inválido");
    const rows = await sql`
      INSERT INTO workout_set_logs (workout_session_id, item_snapshot_key, set_index, actual_reps, actual_load, actual_rir)
      SELECT ws.id, ${key}, ${setIndex}, ${reps}, ${load}, ${rir}
      FROM workout_sessions ws
      WHERE ws.member_training_plan_id = ${assignmentId} AND ws.member_id = ${memberId}
        AND ws.week_number = ${week} AND ws.day_index = ${day} AND ws.status = 'in_progress'
      ON CONFLICT (workout_session_id, item_snapshot_key, set_index)
      DO UPDATE SET actual_reps = EXCLUDED.actual_reps, actual_load = EXCLUDED.actual_load, actual_rir = EXCLUDED.actual_rir
      RETURNING id
    `;
    if (!rows.length) return { success: false, error: "Iniciá una sesión en curso para registrar las cargas." };
    revalidatePath("/miembro/rutina");
    return { success: true };
  } catch (e) { return { success: false, error: e instanceof Error ? e.message : "No se pudo guardar la serie" }; }
}

export async function finishPlanSession(assignmentId: number, week: number, day: number): Promise<Result> {
  try {
    const { memberId, days } = await memberContext(assignmentId, week, day);
    const requiredKeys: string[] = days[day - 1].blocks.flatMap((b: { items: { key: string }[] }) => b.items.map(i => i.key));
    if (!requiredKeys.length || new Set(requiredKeys).size !== requiredKeys.length) return { success: false, error: "Los ejercicios del plan no tienen identificadores únicos." };
    const logged = await sql`
      SELECT wsl.item_snapshot_key FROM workout_set_logs wsl
      JOIN workout_sessions ws ON ws.id = wsl.workout_session_id
      WHERE ws.member_training_plan_id = ${assignmentId} AND ws.member_id = ${memberId}
        AND ws.week_number = ${week} AND ws.day_index = ${day}
        AND ws.status = 'in_progress' AND wsl.set_index = 1 AND wsl.notes = 'completed'
    `;
    const completedKeys = new Set(logged.map(r => String(r.item_snapshot_key)));
    if (!requiredKeys.every(key => completedKeys.has(key))) return { success: false, error: "Marcá todos los ejercicios antes de finalizar." };
    const rows = await sql`
      UPDATE workout_sessions SET status = 'completed', finished_at = NOW()
      WHERE member_training_plan_id = ${assignmentId} AND member_id = ${memberId}
        AND week_number = ${week} AND day_index = ${day}
        AND status = 'in_progress' AND finished_at IS NULL
      RETURNING id
    `;
    if (!rows.length) return { success: false, error: "La sesión no está iniciada o ya fue finalizada." };
    revalidatePath("/miembro/rutina");
    return { success: true };
  } catch (e) { return { success: false, error: e instanceof Error ? e.message : "No se pudo finalizar" }; }
}
