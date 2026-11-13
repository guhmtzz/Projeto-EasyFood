import prisma from '../../lib/prisma.js';
import { httpError } from '../../lib/httpError.js';
import { logActivity } from '../../lib/activity.js';
import { sendEmail } from '../../lib/emailService.js';
import * as imageService from '../../lib/imageService.js';
import * as validate from '../../lib/validation.js';

// Lista pública: só restaurantes ativos, com a nota média e o total de avaliações
export async function findAllRestaurants() {
  const restaurants = await prisma.restaurant.findMany({
    where: { isActive: true },
    include: { _count: { select: { reviews: true } } },
    orderBy: { id: 'asc' }
  });

  return restaurants.map(({ _count, ...restaurant }) => ({ ...restaurant, reviewsCount: _count.reviews }));
}

// Restaurantes do usuário logado (inclui os desativados)
export async function listOwnedRestaurants(userId) {
  const restaurants = await prisma.restaurant.findMany({
    where: { ownerId: userId },
    include: { _count: { select: { reviews: true, dishes: true } } },
    orderBy: { id: 'desc' }
  });

  return restaurants.map(({ _count, ...restaurant }) => ({
    ...restaurant,
    reviewsCount: _count.reviews,
    dishesCount: _count.dishes
  }));
}

// O mesmo dono não pode ter dois restaurantes com o mesmo nome (sem diferenciar maiúsculas)
async function ensureUniqueName(ownerId, name, ignoreId) {
  const others = await prisma.restaurant.findMany({
    where: { ownerId, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
    select: { name: true }
  });

  const wanted = name.trim().toLowerCase();
  if (others.some((other) => other.name.trim().toLowerCase() === wanted)) {
    throw httpError(409, 'Você já tem um restaurante com esse nome');
  }
}

export async function createRestaurant(data, user) {
  await ensureUniqueName(user.id, data.name);

  // 1) O que realmente importa: cadastrar o restaurante.
  //    A nota nasce zerada: ela vem das avaliações dos clientes (ADR-006).
  const restaurant = await prisma.restaurant.create({
    data: {
      name: data.name,
      category: data.category,
      description: data.description ?? null,
      address: data.address ?? null,
      phone: data.phone ?? null,
      rating: 0,
      ownerId: user.id // quem está logado (vindo do token) vira o dono
    }
  });

  // Quem cadastra o primeiro restaurante passa de cliente a proprietário (ADR-005).
  // Administradores mantêm o perfil.
  if (user.role === 'CUSTOMER') {
    await prisma.user.update({ where: { id: user.id }, data: { role: 'OWNER' } });
  }

  // 2) Ações secundárias: se falharem, o cadastro NÃO é afetado.
  try {
    await sendEmail({
      to: user.email,
      toName: user.name,
      subject: `Bem-vindo à EasyFood, ${restaurant.name}!`,
      header: `Olá, ${restaurant.name}!`,
      body: `Seu restaurante ${restaurant.name} foi cadastrado com sucesso na EasyFood. Categoria: ${restaurant.category}.`,
      footer: 'Equipe EasyFood'
    });
  } catch (error) {
    console.error('Erro ao enviar e-mail de boas-vindas:', error.message);
  }

  await logActivity('RESTAURANT_CREATED', `Restaurante: ${restaurant.name}`);

  return { ...restaurant, reviewsCount: 0 };
}

// Só o dono gerencia o restaurante: 404 se não existe, 403 se não for dele
export async function getOwnedRestaurant(restaurantId, userId) {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: validate.id(restaurantId) } });

  if (!restaurant) throw httpError(404, 'Restaurante não encontrado');
  if (restaurant.ownerId !== userId) {
    throw httpError(403, 'Você não tem permissão para gerenciar este restaurante');
  }

  return restaurant;
}

export async function updateRestaurant(restaurantId, data, user) {
  const restaurant = await getOwnedRestaurant(restaurantId, user.id);

  if (data.name !== undefined) {
    await ensureUniqueName(user.id, data.name, restaurant.id);
  }

  const updated = await prisma.restaurant.update({
    where: { id: restaurant.id },
    data,
    include: { _count: { select: { reviews: true, dishes: true } } }
  });

  const { _count, ...rest } = updated;
  return { ...rest, reviewsCount: _count.reviews, dishesCount: _count.dishes };
}

export async function deleteRestaurant(restaurantId, userId) {
  const restaurant = await getOwnedRestaurant(restaurantId, userId);
  const dishes = await prisma.dish.findMany({ where: { restaurantId: restaurant.id }, select: { imageUrl: true } });

  await prisma.$transaction([
    prisma.review.deleteMany({ where: { restaurantId: restaurant.id } }),
    prisma.dish.deleteMany({ where: { restaurantId: restaurant.id } }),
    prisma.restaurant.delete({ where: { id: restaurant.id } })
  ]);

  // Os arquivos só são apagados depois que o banco confirmou a exclusão
  await imageService.removeImage(restaurant.imageUrl).catch(() => {});
  await Promise.all(dishes.map((dish) => imageService.removeImage(dish.imageUrl).catch(() => {})));

  await logActivity('RESTAURANT_DELETED', `Restaurante: ${restaurant.name}`);
}

// Capa do restaurante
export async function updateRestaurantImage(restaurantId, buffer, userId) {
  const restaurant = await getOwnedRestaurant(restaurantId, userId);

  return imageService.replaceImage(
    buffer,
    { folder: 'restaurants', width: 1200, height: 600 },
    restaurant.imageUrl,
    (imageUrl) => prisma.restaurant.update({ where: { id: restaurant.id }, data: { imageUrl } })
  );
}

export async function removeRestaurantImage(restaurantId, userId) {
  const restaurant = await getOwnedRestaurant(restaurantId, userId);

  return imageService.clearImage(restaurant.imageUrl, () =>
    prisma.restaurant.update({ where: { id: restaurant.id }, data: { imageUrl: null } })
  );
}

// Números do painel do proprietário
export async function getDashboard(userId) {
  const [restaurants, availableDishes, reviews] = await Promise.all([
    prisma.restaurant.count({ where: { ownerId: userId, isActive: true } }),
    prisma.dish.count({ where: { restaurant: { ownerId: userId }, isAvailable: true } }),
    prisma.review.count({ where: { restaurant: { ownerId: userId } } })
  ]);

  return { restaurants, availableDishes, reviews };
}
