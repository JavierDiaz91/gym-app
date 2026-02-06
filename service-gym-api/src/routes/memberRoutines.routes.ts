import { Router } from "express";
import {
  createMemberRoutine,
  getMemberRoutine
} from "../controllers/memberRoutines.controller";

const router = Router();

router.post("/member-routines", createMemberRoutine);
router.get("/members/:id/routine", getMemberRoutine);

export default router;
