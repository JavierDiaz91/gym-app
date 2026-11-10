"use server";

import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function requestMembershipPlan(planId: number): Promise<{ success: boolean; message: string }> {
  const session = await getSession();
  if (!session || session.role !== "member" || !Number.isSafeInteger(session.gymId) || !Number.isSafeInteger(planId) || planId <= 0) {
    return { success: false, message: "Solicitud no autorizada." };
  }

  try {
    const [member] = await sql`
      SELECT id FROM members WHERE user_id = ${session.id} AND gym_id = ${session.gymId} LIMIT 1
    `;
    if (!member) return { success: false, message: "No encontramos tu perfil en este gimnasio." };

    const [plan] = await sql`
      SELECT id FROM membership_plans WHERE id = ${planId} AND gym_id = ${session.gymId} AND is_active = true LIMIT 1
    `;
    if (!plan) return { success: false, message: "Este plan no está disponible en tu gimnasio." };

    const [active] = await sql`
      SELECT s.id FROM subscriptions s
      JOIN membership_plans p ON p.id = s.plan_id AND p.gym_id = ${session.gymId}
      WHERE s.member_id = ${member.id}
        AND s.status IN ('active','scheduled')
        AND s.end_date > CURRENT_DATE
      LIMIT 1
    `;
    if (active) return { success: false, message: "Ya tenés una membresía vigente o programada. Consultá con tu gimnasio para cambiarla." };

    const [existing] = await sql`
      SELECT id FROM member_plan_requests
      WHERE member_id = ${member.id} AND gym_id = ${session.gymId} AND status = 'pending' LIMIT 1
    `;
    if (existing) return { success: false, message: "Ya tenés una solicitud pendiente. El gimnasio debe revisarla." };

    const rows = await sql`
      INSERT INTO member_plan_requests (gym_id, member_id, plan_id, status)
      VALUES (${session.gymId}, ${member.id}, ${planId}, 'pending')
      ON CONFLICT (member_id) WHERE status = 'pending' DO NOTHING
      RETURNING id
    `;
    if (!rows.length) return { success: false, message: "Ya existe una solicitud pendiente." };

    revalidatePath("/miembro/planes");
    return { success: true, message: "Solicitud enviada. Tu gimnasio debe confirmar la asignación y el pago antes de habilitar el acceso." };
  } catch (error) {
    console.error("Error al solicitar plan:", error);
    return { success: false, message: "No se pudo enviar la solicitud. Intentá nuevamente más tarde." };
  }
}
