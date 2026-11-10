"use server";

import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function resolvePlanRequest(id: number, decision: "approved" | "rejected") {
  const session = await getSession();
  if (!session || session.role !== "admin" || !Number.isSafeInteger(session.gymId) ||
      !Number.isSafeInteger(id) || id <= 0 || !["approved", "rejected"].includes(decision)) {
    return { success: false, message: "No autorizado." };
  }

  try {
    if (decision === "approved") {
      // An approval only closes a request when an actual paid membership for the
      // requested plan exists. This action never creates subscriptions or payments.
      const rows = await sql`
        UPDATE member_plan_requests r SET status = 'approved', resolved_at = now()
        WHERE r.id = ${id} AND r.gym_id = ${session.gymId} AND r.status = 'pending'
          AND EXISTS (
            SELECT 1 FROM members m
            JOIN subscriptions s ON s.member_id = m.id
            JOIN membership_plans p ON p.id = s.plan_id AND p.gym_id = m.gym_id
            WHERE m.id = r.member_id AND m.gym_id = r.gym_id
              AND s.plan_id = r.plan_id AND s.payment_status = 'paid'
              AND s.status IN ('active','scheduled') AND s.end_date > CURRENT_DATE
          )
        RETURNING id
      `;
      if (!rows.length) return { success: false, message: "Primero asigná el plan y confirmá su pago desde la gestión de miembros. No se habilitó ningún acceso." };
    } else {
      const rows = await sql`
        UPDATE member_plan_requests SET status = 'rejected', resolved_at = now()
        WHERE id = ${id} AND gym_id = ${session.gymId} AND status = 'pending'
        RETURNING id
      `;
      if (!rows.length) return { success: false, message: "La solicitud ya no está pendiente." };
    }
    revalidatePath("/admin/solicitudes-planes");
    revalidatePath("/miembro/planes");
    return { success: true, message: decision === "approved" ? "Solicitud completada. Se verificó la membresía pagada." : "Solicitud rechazada." };
  } catch (error) {
    console.error("Error resolving gym plan request:", error);
    return { success: false, message: "No se pudo procesar la solicitud." };
  }
}
