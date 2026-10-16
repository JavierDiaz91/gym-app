"use server";

import { getSession } from "@/app/actions";
import { sql } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function reviewSaaSTransferAction(
  submissionId: number,
  decision: "approve" | "reject",
  notes: string
) {
  const session = await getSession();
  if (!session || session.role !== "superadmin") {
    return { success: false, error: "Solo el SuperAdmin puede revisar transferencias." };
  }
  if (!Number.isSafeInteger(submissionId) || submissionId <= 0 ||
      !["approve", "reject"].includes(decision) || typeof notes !== "string" || notes.length > 2000) {
    return { success: false, error: "Datos inválidos." };
  }
  if (decision === "approve" && notes.trim().length < 8) {
    return { success: false, error: "Para aprobar, indicá dónde verificaste el ingreso del dinero." };
  }
  try {
    const [result] = await sql`
      SELECT public.review_kivra_saas_transfer(
        ${submissionId}, ${session.id}, ${decision === "approve"}, ${notes.trim()}
      ) AS updated
    `;
    if (result?.updated !== true) {
      return { success: false, error: "La transferencia ya fue revisada o no está disponible." };
    }
    revalidatePath("/admin/facturacion/transferencias");
    revalidatePath("/admin/mi-suscripcion");
    revalidatePath("/admin/facturacion");
    return { success: true };
  } catch (error) {
    console.error("Kivra transfer review failed", error);
    return { success: false, error: "No se pudo registrar la revisión." };
  }
}
