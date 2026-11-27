import { sql } from "../db/neon";
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

// Existing role checks remain authoritative; this guard adds tenant feature restrictions.
export function requireModule(code: string, roles: string[] = ["admin"]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ success: false, code: "AUTH_REQUIRED" });
    if (!roles.includes(req.auth.role)) return next();
    try {
      const [access] = await sql`SELECT public.kivra_gym_module_enabled(${req.auth.gymId}::integer, ${code}::text, ${req.auth.role}::text) AS enabled`;
      if (access?.enabled !== true) return res.status(403).json({ success: false, code: "MODULE_DISABLED", error: "Módulo deshabilitado" });
      return next();
    } catch (error) { return next(error); }
  };
}
