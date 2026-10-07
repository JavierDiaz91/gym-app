import { Router } from "express";
import { MembershipController } from "../controllers/membership.controller";
import { authenticate, requireRole } from "../middlewares/auth";
import { checkTenantStatus } from "../middlewares/checkTenantStatus";

const router = Router();

router.use(authenticate);
router.use(checkTenantStatus);

router.get(
  "/plans",
  requireRole("admin", "trainer", "member", "superadmin"),
  MembershipController.getPlans
);
router.post(
  "/plans",
  requireRole("admin", "superadmin"),
  MembershipController.createPlan
);
router.post(
  "/subscribe",
  requireRole("admin", "superadmin"),
  MembershipController.subscribeMember
);
router.put(
  "/plans/:id",
  requireRole("admin", "superadmin"),
  MembershipController.updatePlan
);
router.delete(
  "/plans/:id",
  requireRole("admin", "superadmin"),
  MembershipController.deletePlan
);
router.post(
  "/:id/memberships",
  requireRole("admin", "superadmin"),
  MembershipController.assignMembership
);

export default router;
