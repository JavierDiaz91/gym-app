import { Router } from "express";
import { createRoutineExercise } from "../controllers/routineExercises.controller";

const router = Router();

router.post("/", createRoutineExercise);

export default router;
