import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/auth";
import { checkTenantStatus } from "../middlewares/checkTenantStatus";

const router = Router();

router.use(authenticate);
router.use(checkTenantStatus);
router.use(requireRole("admin", "trainer", "superadmin"));

// Legacy controllers accept caller-supplied trainerId without tenant ownership checks.
// Keep this endpoint unavailable until tenant-scoped services are implemented.
router.all("/", (_req, res) =>
  res.status(503).json({
    success: false,
    code: "ROUTINES_MAINTENANCE",
    error: "El modulo de rutinas esta temporalmente en mantenimiento.",
  })
);

export default router;
