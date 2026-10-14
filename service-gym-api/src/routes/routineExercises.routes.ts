import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/auth";
import { checkTenantStatus } from "../middlewares/checkTenantStatus";

const router = Router();

router.use(authenticate);
router.use(checkTenantStatus);
router.use(requireRole("admin", "trainer", "superadmin"));

// Legacy service does not verify routine ownership before inserting exercises.
router.all("/", (_req, res) =>
  res.status(503).json({
    success: false,
    code: "ROUTINES_MAINTENANCE",
    error: "La edicion de ejercicios esta temporalmente en mantenimiento.",
  })
);

export default router;
