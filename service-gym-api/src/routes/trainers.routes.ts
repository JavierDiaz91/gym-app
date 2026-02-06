import { Router } from "express";
import * as service from "../services/trainers.service";

const router = Router();

router.get("/", async (_, res) => {
  res.json(await service.getTrainers());
});

router.get("/:id/members", async (req, res) => {
  res.json(await service.getTrainerMembers(Number(req.params.id)));
});

export default router;
