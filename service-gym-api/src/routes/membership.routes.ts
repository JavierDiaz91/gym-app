import { Router } from "express";
import { MembershipController } from "../controllers/membership.controller";
import { authenticate, requireRole } from "../middlewares/auth";
import { checkTenantStatus, requireModule } from "../middlewares/checkTenantStatus";

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
  requireModule("memberships"), MembershipController.createPlan
);
router.post(
  "/plans/flexible-drafts",
  requireRole("admin", "superadmin"),
  requireModule("memberships"), MembershipController.createFlexibleDraft
);
router.post(
  "/payments/flexible-in-person",
  requireRole("admin", "superadmin"),
  requireModule("payments"), MembershipController.recordFlexibleInPersonPayment
);
router.post(
  "/plans/:id/activate-flexible",
  requireRole("admin", "superadmin"),
  requireModule("memberships"), MembershipController.activateFlexiblePlan
);
router.post(
  "/subscribe",
  requireRole("admin", "superadmin"),
  requireModule("memberships"), MembershipController.subscribeMember
);
router.put(
  "/plans/:id",
  requireRole("admin", "superadmin"),
  requireModule("memberships"), MembershipController.updatePlan
);
router.delete(
  "/plans/:id",
  requireRole("admin", "superadmin"),
  requireModule("memberships"), MembershipController.deletePlan
);

export default router;
