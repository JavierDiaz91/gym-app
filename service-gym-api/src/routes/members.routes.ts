import { Router } from "express";
import * as controller from "../controllers/members.controller";
import { authenticate, requireRole } from "../middlewares/auth";
import { checkTenantStatus, requireModule } from "../middlewares/checkTenantStatus";

const router = Router();

router.use(authenticate);
router.use(checkTenantStatus);

router.get("/", requireRole("admin", "trainer", "superadmin"), requireModule("members", ["admin", "trainer"]), controller.getMembers);
router.get("/:id", requireRole("admin", "trainer", "member", "superadmin"), requireModule("members", ["admin", "trainer"]), controller.getMember);
router.post("/", requireRole("admin", "superadmin"), requireModule("members"), controller.createMember);
router.put("/:id", requireRole("admin", "superadmin"), requireModule("members"), controller.updateMember);
router.delete("/:id", requireRole("admin", "superadmin"), requireModule("members"), controller.deleteMember);

// Legacy routine handlers are not tenant-scoped. Disable until secured.
router.all(
  "/member-routines",
  requireRole("admin", "trainer", "superadmin"),
  (_req, res) => res.status(503).json({
    success: false,
    code: "ROUTINES_MAINTENANCE",
    error: "La asignacion de rutinas esta temporalmente en mantenimiento.",
  })
);
router.all(
  "/:id/routine",
  requireRole("admin", "trainer", "member", "superadmin"),
  (_req, res) => res.status(503).json({
    success: false,
    code: "ROUTINES_MAINTENANCE",
    error: "La consulta de rutinas esta temporalmente en mantenimiento.",
  })
);

export default router;
