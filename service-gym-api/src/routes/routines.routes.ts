import { Router } from "express";
import { createRoutineController } from "../controllers/routines.controller";
import { getRoutines } from "../controllers/routines.controller";
import { createRoutineHandler } from "../controllers/routines.controller";

const router = Router();

// POST /api/routines
router.post("/", createRoutineController);
router.get("/", getRoutines);
router.post("/", createRoutineHandler);

export default router;
