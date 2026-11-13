import prisma from '../../lib/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { httpError } from '../../lib/httpError.js';
import * as imageService from '../../lib/imageService.js';

// Nunca devolvemos a senha: este é o formato público de um usuário
function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, imageUrl: user.imageUrl };
}

// O e-mail chega normalizado (minúsculo) do controller, então a busca por igualdade basta
export async function registerUser({ name, email, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw httpError(409, 'E-mail já cadastrado');

  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, password: hash }
  });

  return publicUser(user);
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const senhaConfere = await bcrypt.compare(password, user.password);
  if (!senhaConfere) return null;

  const token = jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  return { token, user: publicUser(user) };
}

export async function getUserById(id) {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? publicUser(user) : null;
}

// Foto de perfil: o id vem sempre do token (req.user), nunca do corpo da requisição
async function findOrFail(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw httpError(404, 'Usuário não encontrado');
  return user;
}

export async function updateProfileImage(userId, buffer) {
  const user = await findOrFail(userId);

  const updated = await imageService.replaceImage(
    buffer,
    { folder: 'users', width: 400, height: 400 },
    user.imageUrl,
    (imageUrl) => prisma.user.update({ where: { id: userId }, data: { imageUrl } })
  );

  return publicUser(updated);
}

export async function removeProfileImage(userId) {
  const user = await findOrFail(userId);

  const updated = await imageService.clearImage(user.imageUrl, () =>
    prisma.user.update({ where: { id: userId }, data: { imageUrl: null } })
  );

  return publicUser(updated);
}
