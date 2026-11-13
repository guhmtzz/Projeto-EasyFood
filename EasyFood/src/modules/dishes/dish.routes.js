import { Router } from 'express';
import * as controller from './dish.controller.js';
import { verifyJWT, optionalJWT } from '../../middlewares/authMiddleware.js';
import { uploadImage } from '../../middlewares/uploadMiddleware.js';

const router = Router();

// Públicas (o token, se vier, deixa o dono enxergar os pratos indisponíveis)
router.get('/restaurants/:restaurantId/dishes', optionalJWT, controller.list);
router.get('/dishes/:dishId', optionalJWT, controller.getById);

// Protegidas: só o dono do restaurante
router.post('/restaurants/:restaurantId/dishes', verifyJWT, controller.create);
router.put('/dishes/:dishId', verifyJWT, controller.update);
router.delete('/dishes/:dishId', verifyJWT, controller.remove);

router.post('/dishes/:dishId/image', verifyJWT, uploadImage('image'), controller.uploadImage);
router.delete('/dishes/:dishId/image', verifyJWT, controller.removeImage);

export default router;
