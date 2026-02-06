import { Router } from "express";
import * as controller from "../controllers/members.controller";
import { createMemberRoutine, getMemberRoutine } from "../controllers/memberRoutines.controller";

const router = Router();

router.get("/", controller.getMembers);
router.get("/:id", controller.getMember);
router.post("/", controller.createMember);
router.put("/:id", controller.updateMember);
router.delete("/:id", controller.deleteMember);
router.post("/member-routines", createMemberRoutine);
router.get("/:id/routine", getMemberRoutine);

export default router;
