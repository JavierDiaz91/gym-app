import { Router } from "express";
import { GymsController } from "../controllers/gyms.controller";
import {
  authenticate,
  requireRole,
  requireSameGymOrSuperAdmin,
} from "../middlewares/auth";
import { checkTenantStatus } from "../middlewares/checkTenantStatus";

const router = Router();

router.use(authenticate);
router.use(checkTenantStatus);

router.get("/", requireRole("superadmin"), GymsController.list);
router.get("/:id", requireSameGymOrSuperAdmin, GymsController.getById);
router.post("/", requireRole("superadmin"), GymsController.create);
router.put(
  "/:id",
  requireRole("admin", "superadmin"),
  requireSameGymOrSuperAdmin,
  GymsController.update
);
router.patch(
  "/:id/status",
  requireRole("superadmin"),
  GymsController.updateStatus
);

router.get(
  "/:id/configuracion/horarios",
  requireRole("admin", "superadmin"),
  requireSameGymOrSuperAdmin,
  GymsController.getSchedules
);
router.post(
  "/:id/configuracion/horarios",
  requireRole("admin", "superadmin"),
  requireSameGymOrSuperAdmin,
  GymsController.saveSchedules
);

export default router;
