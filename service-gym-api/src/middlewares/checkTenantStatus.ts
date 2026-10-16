import { shouldCheckSaaSAccess } from "./saasPilotPolicy";
import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "./auth";
import { sql } from "../db/neon";

export async function checkTenantStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.auth) {
    return res.status(401).json({
      success: false,
      code: "AUTH_REQUIRED",
      error: "Autenticación requerida.",
    });
  }

  if (
    req.auth.role !== "superadmin" &&
    req.auth.gymStatus === "suspended"
  ) {
    return res.status(403).json({
      success: false,
      code: "TENANT_SUSPENDED",
      error: "El gimnasio se encuentra suspendido. No se pueden realizar operaciones.",
    });
  }

  // Apply SaaS restrictions only to the explicitly selected pilot gym admin.
  // Members and trainers keep their gym operations; SuperAdmin is exempt.
  // Never rely on the frontend navigation gate for API authorization.
  const gymId = req.auth.gymId;
  if (req.auth.role !== "admin" || gymId == null || !shouldCheckSaaSAccess(req.auth.role, gymId, process.env.KIVRA_SAAS_ACCESS_GATE_ENABLED, process.env.KIVRA_SAAS_ACCESS_TEST_GYM_ID)) {
    return next();
  }

  try {
    const rows = await sql`
      SELECT allowed, reason
      FROM public.kivra_saas_access_preview(${gymId})
    `;
    if (rows.length !== 1 || rows[0].allowed !== true) {
      return res.status(403).json({
        success: false,
        code: "KIVRA_SAAS_PAYMENT_REQUIRED",
        error: "La suscripción Kivra está vencida. Ingresá a Mi suscripción para regularizarla.",
      });
    }
    return next();
  } catch (error) {
    console.error("Error validando acceso SaaS en API:", error);
    return res.status(503).json({
      success: false,
      code: "KIVRA_SAAS_ACCESS_UNAVAILABLE",
      error: "No se pudo verificar temporalmente el acceso al servicio.",
    });
  }
}
