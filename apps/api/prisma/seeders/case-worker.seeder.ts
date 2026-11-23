import { randomBytes, scryptSync } from 'node:crypto';
import type {
  CaseWorker,
  PrismaClient,
} from '../../src/generated/prisma/client.js';

const demoEmployeeNumber = 'DEMO001';

/** Seeds the superuser used by the local caseworker routes. */
export async function seedDemoSuperUser(
  prisma: PrismaClient,
  municipalityId: number,
): Promise<CaseWorker> {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(randomBytes(32), salt, 64).toString('hex');

  return prisma.caseWorker.upsert({
    where: { employeeNumber: demoEmployeeNumber },
    update: {},
    create: {
      employeeNumber: demoEmployeeNumber,
      name: 'Demo Superbruger',
      email: 'superbruger@example.test',
      phoneNumber: '12345678',
      passwordHash: `scrypt:${salt}:${hash}`,
      isSuperUser: true,
      municipalityId,
    },
  });
}
