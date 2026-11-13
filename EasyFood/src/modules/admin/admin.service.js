import prisma from '../../lib/prisma.js';

export async function getOverview() {
  const [users, restaurants, dishes, reviews] = await Promise.all([
    prisma.user.count(),
    prisma.restaurant.count(),
    prisma.dish.count(),
    prisma.review.count()
  ]);

  return { users, restaurants, dishes, reviews };
}

// Todos os restaurantes (inclusive desativados), com o proprietário
export async function listAllRestaurants() {
  const restaurants = await prisma.restaurant.findMany({
    include: {
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { dishes: true, reviews: true } }
    },
    orderBy: { id: 'desc' }
  });

  return restaurants.map(({ _count, ...restaurant }) => ({
    ...restaurant,
    dishesCount: _count.dishes,
    reviewsCount: _count.reviews
  }));
}
