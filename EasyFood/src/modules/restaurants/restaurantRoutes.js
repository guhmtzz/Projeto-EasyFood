import { Router } from 'express';
import {
  getRestaurants,
  getMyRestaurants,
  getMyDashboard,
  postRestaurant,
  putRestaurant,
  removeRestaurant,
  postRestaurantImage,
  deleteRestaurantImage
} from './restaurantControler.js';
import { verifyJWT } from '../../middlewares/authMiddleware.js';
import { uploadImage } from '../../middlewares/uploadMiddleware.js';

const router = Router();

// Rota pública: Qualquer um pode listar os restaurantes
router.get('/restaurants', getRestaurants);

// Rotas protegidas: apenas usuários autenticados (com token JWT válido).
// "/mine" e "/dashboard" vêm antes das rotas com :restaurantId.
router.get('/restaurants/mine', verifyJWT, getMyRestaurants);
router.get('/restaurants/dashboard', verifyJWT, getMyDashboard);
router.post('/restaurants', verifyJWT, postRestaurant);

// Daqui para baixo, só o dono do restaurante (o service confere)
router.put('/restaurants/:restaurantId', verifyJWT, putRestaurant);
router.delete('/restaurants/:restaurantId', verifyJWT, removeRestaurant);

// verifyJWT vem antes do upload: sem token, o arquivo nem chega a ser lido
router.post('/restaurants/:restaurantId/image', verifyJWT, uploadImage('image'), postRestaurantImage);
router.delete('/restaurants/:restaurantId/image', verifyJWT, deleteRestaurantImage);

export default router;
