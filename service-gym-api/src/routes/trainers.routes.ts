import { Router } from "express";
import * as service from "../services/trainers.service";
import * as trainersController from "../controllers/trainers.controller";
import { authenticate, requireRole } from "../middlewares/auth";
import { checkTenantStatus } from "../middlewares/checkTenantStatus";

const router = Router();

router.use(authenticate);
router.use(checkTenantStatus);

router.get(
  "/",
  requireRole("admin", "trainer", "member", "superadmin"),
  trainersController.getTrainers
);

router.get(
  "/:id",
  requireRole("admin", "trainer", "member", "superadmin"),
  trainersController.getTrainerById
);

router.get(
  "/:id/members",
  requireRole("admin", "trainer", "superadmin"),
  async (req, res) => {
    res.json(await service.getTrainerMembers(Number(req.params.id)));
  }
);

export default router;
