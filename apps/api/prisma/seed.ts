import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { seedApplication } from './seeders/application.seeder.js';
import { seedDemoSuperUser } from './seeders/case-worker.seeder.js';
import { seedMunicipality } from './seeders/municipality.seeder.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL must be set to seed the database.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

/** Seeds the demo data and prints the municipality URL and superuser number. */
export async function seed(): Promise<void> {
  const application = await seedApplication(prisma);
  console.log('Seeded application:', application.caseNumber);

  const municipality = await seedMunicipality(prisma);
  console.log(
    'Demo municipality:',
    `http://localhost:5173/sagsbehandler/kommuner/${municipality.id}`,
  );

  const superUser = await seedDemoSuperUser(prisma, municipality.id);
  console.log('Demo superuser:', superUser.employeeNumber);
}

try {
  await seed();
} finally {
  await prisma.$disconnect();
}
