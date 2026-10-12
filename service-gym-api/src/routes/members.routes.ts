import { Router } from "express";
import * as controller from "../controllers/members.controller";
import {
  createMemberRoutine,
  getMemberRoutine,
} from "../controllers/memberRoutines.controller";
import { authenticate, requireRole } from "../middlewares/auth";
import { checkTenantStatus } from "../middlewares/checkTenantStatus";

const router = Router();

router.use(authenticate);
router.use(checkTenantStatus);

router.get("/", requireRole("admin", "trainer", "superadmin"), controller.getMembers);
router.get("/:id", requireRole("admin", "trainer", "member", "superadmin"), controller.getMember);
router.post("/", requireRole("admin", "superadmin"), controller.createMember);
router.put("/:id", requireRole("admin", "superadmin"), controller.updateMember);
router.delete("/:id", requireRole("admin", "superadmin"), controller.deleteMember);
router.post(
  "/member-routines",
  requireRole("admin", "trainer", "superadmin"),
  createMemberRoutine
);
router.get(
  "/:id/routine",
  requireRole("admin", "trainer", "member", "superadmin"),
  getMemberRoutine
);

export default router;
