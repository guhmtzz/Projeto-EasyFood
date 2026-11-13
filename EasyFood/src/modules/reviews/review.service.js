import prisma from '../../lib/prisma.js';
import { httpError } from '../../lib/httpError.js';
import * as validate from '../../lib/validation.js';

async function findRestaurant(restaurantId) {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: validate.id(restaurantId) } });
  if (!restaurant) throw httpError(404, 'Restaurante não encontrado');
  return restaurant;
}

// Média com uma casa decimal (formato mostrado na tela) e total de avaliações
async function summarize(db, restaurantId) {
  const result = await db.review.aggregate({
    where: { restaurantId },
    _avg: { rating: true },
    _count: { _all: true }
  });

  return {
    rating: result._avg.rating ? Math.round(result._avg.rating * 10) / 10 : 0,
    reviewsCount: result._count._all
  };
}

// Cria ou troca a avaliação do usuário e recalcula a nota do restaurante (ADR-006)
export async function rate(restaurantId, userId, value) {
  const restaurant = await findRestaurant(restaurantId);

  if (restaurant.ownerId === userId) {
    throw httpError(403, 'Você não pode avaliar o próprio restaurante');
  }
  const rating = validate.stars(value);

  // Gravação e recálculo na mesma transação, para a média nunca ficar fora de sincronia
  const summary = await prisma.$transaction(async (tx) => {
    await tx.review.upsert({
      where: { userId_restaurantId: { userId, restaurantId: restaurant.id } },
      create: { userId, restaurantId: restaurant.id, rating },
      update: { rating }
    });

    const result = await summarize(tx, restaurant.id);
    await tx.restaurant.update({ where: { id: restaurant.id }, data: { rating: result.rating } });
    return result;
  });

  return { restaurantId: restaurant.id, ...summary, myRating: rating };
}

// Nota que o usuário logado já deu (para acender as estrelas na tela)
export async function getMyRating(restaurantId, userId) {
  const restaurant = await findRestaurant(restaurantId);

  const review = await prisma.review.findUnique({
    where: { userId_restaurantId: { userId, restaurantId: restaurant.id } }
  });

  return { restaurantId: restaurant.id, myRating: review ? review.rating : null };
}
