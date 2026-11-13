// Dados de exemplo para desenvolvimento: usuários, restaurantes, cardápios e avaliações.
// Uso: npx prisma db seed   (pode ser executado mais de uma vez sem duplicar dados)

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

if (process.env.NODE_ENV === 'production') {
  console.error('O seed é só para desenvolvimento e não roda com NODE_ENV=production.');
  process.exit(1);
}

const prisma = new PrismaClient();

// Senha dos usuários de exemplo (altere com SEED_PASSWORD no .env, se quiser)
const PASSWORD = process.env.SEED_PASSWORD || '123456';

const USERS = [
  { name: 'Administrador', email: 'admin@easyfood.com', role: 'ADMIN' },
  { name: 'Dono de Exemplo', email: 'dono@easyfood.com', role: 'OWNER' },
  { name: 'Maria Cliente', email: 'maria@easyfood.com', role: 'CUSTOMER' },
  { name: 'João Cliente', email: 'joao@easyfood.com', role: 'CUSTOMER' }
];

const RESTAURANTS = [
  {
    name: 'Pizzaria Napoli',
    category: 'Pizza',
    description: 'Pizzas de massa fina assadas em forno a lenha.',
    address: 'Rua das Flores, 120',
    phone: '(11) 4000-1001',
    dishes: [
      { name: 'Margherita', category: 'Pizzas', price: '42.90', description: 'Molho de tomate, muçarela e manjericão fresco.' },
      { name: 'Calabresa', category: 'Pizzas', price: '46.90', description: 'Calabresa fatiada, cebola e azeitonas.' },
      { name: 'Tiramisù', category: 'Sobremesas', price: '24.00', description: 'Sobremesa italiana com café e mascarpone.' }
    ],
    ratings: { 'maria@easyfood.com': 5, 'joao@easyfood.com': 4 }
  },
  {
    name: 'Burger House',
    category: 'Burger',
    description: 'Hambúrgueres artesanais com pão de brioche.',
    address: 'Av. Central, 800',
    phone: '(11) 4000-1002',
    dishes: [
      { name: 'Clássico', category: 'Hambúrgueres', price: '32.00', description: 'Blend de 160 g, queijo cheddar, alface e tomate.' },
      { name: 'Duplo Bacon', category: 'Hambúrgueres', price: '39.90', description: 'Dois blends, bacon crocante e molho da casa.' },
      { name: 'Batata rústica', category: 'Porções', price: '18.00', description: 'Batatas com casca, alho e alecrim.' }
    ],
    ratings: { 'maria@easyfood.com': 4, 'joao@easyfood.com': 4 }
  },
  {
    name: 'Sushi Express',
    category: 'Japonesa',
    description: 'Culinária japonesa tradicional, com peixe fresco todo dia.',
    address: 'Praça Liberdade, 45',
    phone: '(11) 4000-1003',
    dishes: [
      { name: 'Combo 20 peças', category: 'Combos', price: '69.90', description: 'Sushis e sashimis variados.' },
      { name: 'Temaki de salmão', category: 'Temakis', price: '29.90', description: 'Salmão fresco, cream cheese e cebolinha.' },
      { name: 'Yakisoba', category: 'Pratos quentes', price: '38.00', description: 'Macarrão salteado com legumes e carne.' }
    ],
    ratings: { 'maria@easyfood.com': 5, 'joao@easyfood.com': 5 }
  }
];

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);

  // Usuários (idempotente: pelo e-mail)
  const users = {};
  for (const data of USERS) {
    users[data.email] = await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: { ...data, password: hash }
    });
  }
  const owner = users['dono@easyfood.com'];

  for (const item of RESTAURANTS) {
    const exists = await prisma.restaurant.findFirst({ where: { name: item.name, ownerId: owner.id } });
    if (exists) continue;

    const { dishes, ratings, ...data } = item;

    const restaurant = await prisma.restaurant.create({
      data: { ...data, rating: 0, ownerId: owner.id, dishes: { create: dishes } }
    });

    // Avaliações dos clientes e a média gravada no restaurante (mesma regra da API)
    const values = Object.entries(ratings);
    for (const [email, rating] of values) {
      await prisma.review.create({
        data: { rating, userId: users[email].id, restaurantId: restaurant.id }
      });
    }
    const average = values.reduce((sum, [, rating]) => sum + rating, 0) / values.length;
    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { rating: Math.round(average * 10) / 10 }
    });
  }

  console.log('Dados de exemplo inseridos com sucesso!');
  console.log(`Usuários de exemplo (senha: ${PASSWORD}):`);
  USERS.forEach((u) => console.log(`  - ${u.email} (${u.role})`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
