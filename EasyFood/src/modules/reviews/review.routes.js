import { Router } from 'express';
import { postReview, getMyReview } from './review.controller.js';
import { verifyJWT } from '../../middlewares/authMiddleware.js';

const router = Router();

// Avaliar exige login: a nota fica ligada ao usuário do token
router.post('/restaurants/:restaurantId/reviews', verifyJWT, postReview);
router.get('/restaurants/:restaurantId/reviews/me', verifyJWT, getMyReview);

export default router;
