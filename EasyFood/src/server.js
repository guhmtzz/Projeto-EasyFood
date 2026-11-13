import 'dotenv/config';
import app from './app.js';

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET não definido no .env');
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.warn('Aviso: o JWT_SECRET tem menos de 32 caracteres. Use uma chave mais forte (veja o README).');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`EasyFood rodando na porta ${PORT}`));
