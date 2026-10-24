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

export async function finishPlanSession(assignmentId: number, week: number, day: number): Promise<Result> {
  try {
    const { memberId } = await memberContext(assignmentId, week, day);
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
