"use server";

import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function resolvePlanRequest(id: number, decision: "approved" | "rejected") {
  const session = await getSession();
  if (!session || session.role !== "admin" || session.gymId == null ||
      !Number.isSafeInteger(id) || id <= 0 || !["approved", "rejected"].includes(decision)) {
    return { success: false, message: "No autorizado." };
  }

  try {
    const rows = await sql`
      SELECT public.resolve_member_plan_request(
        ${id}::bigint, ${session.gymId}::integer, ${decision === "approved"}::boolean
      ) AS result
    `;
    const result = String(rows[0]?.result ?? "");
    const messages: Record<string, string> = {
      APPROVED: "Plan asignado con pago pendiente. El acceso se habilitará cuando se confirme el cobro.",
      REJECTED: "Solicitud rechazada.",
      NOT_FOUND: "No se encontró la solicitud en tu gimnasio.",
      ALREADY_RESOLVED: "La solicitud ya fue resuelta.",
      INVALID_MEMBER: "El alumno no pertenece a este gimnasio.",
      PLAN_UNAVAILABLE: "El plan ya no está disponible.",
      ALREADY_SUBSCRIBED: "El alumno ya tiene una membresía vigente o programada."
    };
    if (result === "APPROVED" || result === "REJECTED") {
      revalidatePath("/admin/solicitudes-planes");
      revalidatePath("/miembro/planes");
      revalidatePath("/miembro/membresia");
      return { success: true, message: messages[result] };
    }
    return { success: false, message: messages[result] || "No se pudo resolver la solicitud." };
  } catch (error) {
    console.error("Error resolving gym plan request:", error);
    return { success: false, message: "No se pudo procesar la solicitud." };
  }
}
