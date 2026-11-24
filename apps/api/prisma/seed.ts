import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { seedActors } from './seeders/actor.seeder.js';
import { seedApplication } from './seeders/application.seeder.js';
import { seedMunicipalities } from './seeders/municipality.seeder.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL must be set to seed the database.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

export async function seed() {
  const municipalities = await seedMunicipalities(prisma);
  console.log('Seeded municipalities:', municipalities.length);

  // Application
  const application = await seedApplication(prisma);
  console.log('Seeded application:', application.caseNumber);

  // Actors (needs the application above)
  const { actors, applicationIds } = await seedActors(prisma);
  console.log(
    'Seeded actors:',
    actors.map((actor) => actor.name).join(', '),
    'on',
    applicationIds.join(', '),
  );
}

try {
  await seed();
} finally {
  await prisma.$disconnect();
}
