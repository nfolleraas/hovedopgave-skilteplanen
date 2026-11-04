import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { seedApplication } from './seeders/application.seeder.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL must be set to seed the database.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

export async function seed() {
  const application = await seedApplication(prisma);

  console.log('Seeded application:', application.caseNumber);
}

try {
  await seed();
} finally {
  await prisma.$disconnect();
}
