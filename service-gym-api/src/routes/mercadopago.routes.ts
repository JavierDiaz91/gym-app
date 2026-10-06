import { Router } from 'express';
import { 
  connectMercadoPago, 
  mercadoPagoCallback, 
  createPreference, 
  handleWebhook 
} from '../controllers/mercadopago.controller';

const router = Router();

// Flujo OAuth (Gimnasio vincula su cuenta)
router.get('/connect', connectMercadoPago);
router.get('/callback', mercadoPagoCallback);

// Flujo de Pagos (Alumno paga su cuota)
router.post('/create-preference', createPreference);
router.post('/webhook', handleWebhook);

export default router;