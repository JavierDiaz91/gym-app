import { Router } from "express";
import {
  connectMercadoPago,
  mercadoPagoCallback,
  createPreference,
  handleWebhook,
} from "../controllers/mercadopago.controller";
import { authenticate, requireRole } from "../middlewares/auth";
import { checkTenantStatus } from "../middlewares/checkTenantStatus";

const router = Router();

router.get(
  "/connect",
  authenticate,
  checkTenantStatus,
  requireRole("admin", "superadmin"),
  connectMercadoPago
);

// Callback externo de OAuth: no lleva sesión del usuario.
router.get("/callback", mercadoPagoCallback);

router.post(
  "/create-preference",
  authenticate,
  checkTenantStatus,
  requireRole("admin", "member", "superadmin"),
  createPreference
);

// Webhook externo de Mercado Pago: debe ser público y validarse por payload/proveedor.
router.post("/webhook", handleWebhook);

export default router;
