import { Router } from "express";
import { MembershipController } from "../controllers/membership.controller";

const router = Router();

router.get("/plans", MembershipController.getPlans);
router.post("/plans", MembershipController.createPlan);
router.post("/subscribe", MembershipController.subscribeMember);
router.put("/plans/:id", MembershipController.updatePlan);
router.delete("/plans/:id", MembershipController.deletePlan);
router.post("/:id/memberships", MembershipController.assignMembership);

export default router;