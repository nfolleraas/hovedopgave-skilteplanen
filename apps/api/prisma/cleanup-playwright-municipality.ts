import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const connectionString = process.env.E2E_DATABASE_URL;
const name = process.argv[2];

const testNamePattern = /^Testkommune [a-p]{32}$/;

if (!connectionString || !name || !testNamePattern.test(name)) {
  throw new Error(
    'Expected E2E_DATABASE_URL and a Playwright municipality name.',
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

try {
  await prisma.$transaction(async (tx) => {
    const municipalities = await tx.municipality.findMany({
      where: { name },
      select: { id: true, addressId: true },
    });
    await tx.municipality.deleteMany({
      where: { id: { in: municipalities.map(({ id }) => id) } },
    });
    await tx.address.deleteMany({
      where: { uuid: { in: municipalities.map(({ addressId }) => addressId) } },
    });
  });
} finally {
  await prisma.$disconnect();
}
