import { Router } from 'express';
import { overview, restaurants } from './admin.controller.js';
import { verifyJWT, requireRole } from '../../middlewares/authMiddleware.js';

const router = Router();

// Tudo aqui exige token e perfil ADMIN (ADR-005)
router.use(verifyJWT, requireRole('ADMIN'));

router.get('/overview', overview);
router.get('/restaurants', restaurants);

export default router;
