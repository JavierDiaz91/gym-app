import { Router } from "express";
import * as service from "../services/trainers.service";
import * as trainersController from "../controllers/trainers.controller";

const router = Router();

// GET: /api/trainers
router.get("/", trainersController.getTrainers);

// GET: /api/trainers/:id
router.get("/:id", trainersController.getTrainerById);

router.get("/", async (_, res) => {
  res.json(await service.getTrainers());
});

router.get("/:id/members", async (req, res) => {
  res.json(await service.getTrainerMembers(Number(req.params.id)));
});

export default router;
