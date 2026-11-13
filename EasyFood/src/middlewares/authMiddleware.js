import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

// Lê o header "Authorization: Bearer <token>" e devolve o payload, ou null se for inválido.
function readToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  try {
    const payload = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    const userId = Number(payload.sub);
    return Number.isSafeInteger(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
}

// Busca o usuário no banco: um token válido pode ser de uma conta que já foi apagada,
// e o perfil (role) precisa ser o atual, não o que estava no momento do login.
function findUser(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true }
  });
}

// Rota protegida: exige token válido de uma conta existente.
export async function verifyJWT(req, res, next) {
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const userId = readToken(req);
  if (!userId) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }

  const user = await findUser(userId);
  if (!user) {
    return res.status(401).json({ error: 'Sua conta não existe mais. Faça login novamente.' });
  }

  req.user = user;
  return next();
}

// Rota pública que se comporta de forma diferente para quem está logado
// (ex.: o dono enxerga pratos indisponíveis). Token ausente ou inválido segue como visitante.
export async function optionalJWT(req, res, next) {
  const userId = readToken(req);
  if (userId) {
    const user = await findUser(userId);
    if (user) req.user = user;
  }
  return next();
}

// Use depois do verifyJWT: libera só os perfis informados (ex.: requireRole('ADMIN')).
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Você não tem permissão para acessar este recurso' });
    }
    return next();
  };
}
