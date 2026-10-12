import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "./auth";

export function checkTenantStatus(
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

  next();
}
