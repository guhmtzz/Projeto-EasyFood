import { Router } from 'express';
import { register, login, me, uploadImage, removeImage } from './auth.controller.js';
import { verifyJWT } from '../../middlewares/authMiddleware.js';
import { uploadImage as receiveImage } from '../../middlewares/uploadMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);

router.get('/me', verifyJWT, me);

// verifyJWT vem antes do upload: sem token, o arquivo nem chega a ser lido
router.post('/me/image', verifyJWT, receiveImage('image'), uploadImage);
router.delete('/me/image', verifyJWT, removeImage);

export default router;
