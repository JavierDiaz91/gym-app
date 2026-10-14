import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/auth";
import { checkTenantStatus } from "../middlewares/checkTenantStatus";

const router = Router();

router.use(authenticate);
router.use(checkTenantStatus);
router.use(requireRole("admin", "trainer", "superadmin"));

// Mounted under /api/member-routines. Legacy handlers do not verify tenant ownership.
router.all("/member-routines", (_req, res) =>
  res.status(503).json({
    success: false,
    code: "ROUTINES_MAINTENANCE",
    error: "La asignacion de rutinas esta temporalmente en mantenimiento.",
  })
);
router.all("/members/:id/routine", (_req, res) =>
  res.status(503).json({
    success: false,
    code: "ROUTINES_MAINTENANCE",
    error: "La consulta de rutinas esta temporalmente en mantenimiento.",
  })
);

export default router;
