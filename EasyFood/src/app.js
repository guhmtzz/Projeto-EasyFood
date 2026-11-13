import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './modules/auth/auth.routes.js';
import restaurantRoutes from './modules/restaurants/restaurantRoutes.js';
import dishRoutes from './modules/dishes/dish.routes.js';
import reviewRoutes from './modules/reviews/review.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import { UPLOADS_DIR } from './lib/imageService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());

// Sem corpo (ou sem Content-Type JSON) o Express 5 deixa req.body undefined;
// com um objeto vazio, os controllers respondem 400 em vez de quebrar com 500
app.use((req, res, next) => {
  if (req.body === undefined) req.body = {};
  next();
});

app.use(express.static(path.join(__dirname, '../public')));

// Imagens enviadas pelos usuários (já otimizadas pelo imageService)
app.use('/uploads', express.static(UPLOADS_DIR));

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use(restaurantRoutes);
app.use(dishRoutes);
app.use(reviewRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Erros que escapam das rotas (ex.: JSON malformado) respondem em JSON, sem expor stack trace
app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido no corpo da requisição' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Corpo da requisição muito grande' });
  }

  console.error('Erro não tratado:', error);
  return res.status(500).json({ error: 'Erro interno do servidor' });
});

export default app;
