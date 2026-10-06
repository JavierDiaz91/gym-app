import { Router } from 'express';
import { GymsController } from '../controllers/gyms.controller';

const router = Router();

router.get('/', GymsController.list);
router.get('/:id', GymsController.getById);
router.post('/', GymsController.create);
router.put('/:id', GymsController.update); // <--- AGREGAR ESTA LÍNEA
router.patch('/:id/status', GymsController.updateStatus);

// Rutas de configuración de horarios y feriados
router.get('/:id/configuracion/horarios', GymsController.getSchedules);
router.post('/:id/configuracion/horarios', GymsController.saveSchedules);

export default router;