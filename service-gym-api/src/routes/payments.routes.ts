import { Router } from "express";
import { createPreference, handleWebhook } from "../controllers/mercadopago.controller";

const router = Router();

// Apuntamos directamente a las funciones actualizadas de mercadopago.controller.ts
router.post("/create-preference", createPreference);
router.post("/webhook", handleWebhook);

export default router;