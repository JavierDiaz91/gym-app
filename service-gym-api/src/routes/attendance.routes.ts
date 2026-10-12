import { Router } from "express";
import { AttendanceController } from "../controllers/attendance.controller";
import { authenticate, requireRole } from "../middlewares/auth";
import { checkTenantStatus } from "../middlewares/checkTenantStatus";

const router = Router();

router.use(authenticate);
router.use(checkTenantStatus);

router.post(
  "/check-in",
  requireRole("admin", "trainer", "superadmin"),
  AttendanceController.checkIn
);

export default router;
