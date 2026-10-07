import { Router } from "express";
import { createPreference, handleWebhook } from "../controllers/mercadopago.controller";
import { authenticate, requireRole } from "../middlewares/auth";
import { checkTenantStatus } from "../middlewares/checkTenantStatus";

const router = Router();

router.post(
  "/create-preference",
  authenticate,
  checkTenantStatus,
  requireRole("admin", "member", "superadmin"),
  createPreference
);

// Mercado Pago debe poder llamar este endpoint sin sesión de usuario.
router.post("/webhook", handleWebhook);

export default router;
