// service-gym-api/src/middlewares/checkTenantStatus.ts
import { Request, Response, NextFunction } from "express";

export function checkTenantStatus(req: Request, res: Response, next: NextFunction) {
  // Asumimos que req.gym fue inyectado en un middleware previo (ej. autenticación o resolveTenant)
  const gym = (req as any).gym;

  if (gym && gym.status === "suspended") {
    return res.status(403).json({
      success: false,
      code: "TENANT_SUSPENDED",
      error: "El gimnasio se encuentra suspendido. No se pueden realizar operaciones.",
    });
  }

  next();
}