import { Router } from 'express';
import { GymsController } from '../controllers/gyms.controller';

const router = Router();

router.get('/', GymsController.list);
router.post('/', GymsController.create);
router.patch('/:id/status', GymsController.updateStatus);

export default router;