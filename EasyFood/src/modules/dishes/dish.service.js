import prisma from '../../lib/prisma.js';
import { httpError } from '../../lib/httpError.js';
import { logActivity } from '../../lib/activity.js';
import * as imageService from '../../lib/imageService.js';
import * as validate from '../../lib/validation.js';

// Valida o corpo de um prato (criação e edição usam as mesmas regras)
export function validateDish(data) {
  const validated = {
    name: validate.text(data.name, 'Nome', { max: 150 }),
    category: validate.text(data.category, 'Categoria', { max: 100 }),
    description: validate.text(data.description ?? '', 'Descrição', { min: 0, max: 1000 }),
    price: validate.price(data.price)
  };

  if (data.isAvailable !== undefined) {
    validated.isAvailable = validate.boolean(data.isAvailable, 'Disponibilidade');
  }

  return validated;
}

// Só o dono do restaurante mexe no cardápio
function ensureOwnership(restaurant, userId) {
  if (!userId || restaurant.ownerId !== userId) {
    throw httpError(403, 'Você não tem permissão para gerenciar este restaurante');
  }
}

// Carrega o prato junto com o restaurante (para saber quem é o dono)
async function getDishWithRestaurant(dishId) {
  const dish = await prisma.dish.findUnique({
    where: { id: validate.id(dishId) },
    include: { restaurant: true }
  });

  if (!dish) throw httpError(404, 'Prato não encontrado');
  return dish;
}

export async function createDish(restaurantId, data, userId) {
  const id = validate.id(restaurantId);
  const validated = validateDish(data);

  const restaurant = await prisma.restaurant.findUnique({ where: { id } });
  if (!restaurant) throw httpError(404, 'Restaurante não encontrado');

  ensureOwnership(restaurant, userId);

  // imageUrl começa vazio: o prato é criado primeiro, a foto é enviada depois
  const dish = await prisma.dish.create({
    data: { ...validated, imageUrl: '', restaurantId: id }
  });

  await logActivity('DISH_CREATED', `Prato: ${dish.name} (restaurante ${restaurant.name})`);
  return dish;
}

// Visitantes veem só pratos disponíveis de restaurantes ativos; o dono vê tudo
export async function listDishes(restaurantId, user) {
  const id = validate.id(restaurantId);

  const restaurant = await prisma.restaurant.findUnique({ where: { id } });
  if (!restaurant) throw httpError(404, 'Restaurante não encontrado');

  const isOwner = Boolean(user) && restaurant.ownerId === user.id;
  if (!isOwner && !restaurant.isActive) return [];

  return prisma.dish.findMany({
    where: { restaurantId: id, ...(isOwner ? {} : { isAvailable: true }) },
    orderBy: { id: 'asc' }
  });
}

export async function getDish(dishId, user) {
  const { restaurant, ...dish } = await getDishWithRestaurant(dishId);

  const isOwner = Boolean(user) && restaurant.ownerId === user.id;
  if (!isOwner && (!dish.isAvailable || !restaurant.isActive)) {
    throw httpError(404, 'Prato não encontrado');
  }

  return dish;
}

export async function updateDish(dishId, data, userId) {
  const validated = validateDish(data);
  const dish = await getDishWithRestaurant(dishId);

  ensureOwnership(dish.restaurant, userId);

  return prisma.dish.update({ where: { id: dish.id }, data: validated });
}

export async function deleteDish(dishId, userId) {
  const dish = await getDishWithRestaurant(dishId);

  ensureOwnership(dish.restaurant, userId);

  await prisma.dish.delete({ where: { id: dish.id } });
  await imageService.removeImage(dish.imageUrl).catch(() => {});
}

// Existência (404) e permissão (403) são checadas antes de processar a imagem
export async function updateDishImage(dishId, buffer, userId) {
  const dish = await getDishWithRestaurant(dishId);

  ensureOwnership(dish.restaurant, userId);

  return imageService.replaceImage(
    buffer,
    { folder: 'dishes', width: 800, height: 600 },
    dish.imageUrl,
    (imageUrl) => prisma.dish.update({ where: { id: dish.id }, data: { imageUrl } })
  );
}

export async function removeDishImage(dishId, userId) {
  const dish = await getDishWithRestaurant(dishId);

  ensureOwnership(dish.restaurant, userId);

  // imageUrl é obrigatório no schema: "sem imagem" é string vazia, como na criação do prato
  return imageService.clearImage(dish.imageUrl, () =>
    prisma.dish.update({ where: { id: dish.id }, data: { imageUrl: '' } })
  );
}
