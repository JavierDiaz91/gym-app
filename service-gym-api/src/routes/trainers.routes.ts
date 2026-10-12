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
  async (req: any, res) => {
    const gymId =
      req.auth?.role === "superadmin"
        ? Number(req.query.gymId)
        : req.auth?.gymId;

    if (!gymId) {
      return res.status(400).json({ error: "gymId requerido" });
    }

    const trainerId = Number(req.params.id);
    const trainer = await service.getTrainerById(Number(gymId), trainerId);

    if (!trainer) {
      return res.status(404).json({ error: "Entrenador no encontrado" });
    }

    res.json(await service.getTrainerMembers(Number(gymId), trainerId));
  }
);

export default router;
