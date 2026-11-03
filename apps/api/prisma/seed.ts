import { PrismaPg } from '@prisma/adapter-pg';
import {
  ApplicantType,
  ApplicationType,
  DocumentType,
  PermitType,
  PrismaClient,
  SignPlanType,
  TrafficChange,
  Usage,
} from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL must be set to seed the database.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const caseNumber = 'DEMO-2026-0001';
const signPlanUuid = 'demo-sign-plan-0001';

export async function seed() {
  const application = await prisma.application.upsert({
    where: { caseNumber },
    update: {},
    create: {
      caseNumber,
      title: 'Demo skilteplan',
      applicantReference: 'DEMO-APPLICANT-0001',
      type: ApplicationType.RoadUsePermit,
      trafficChange: TrafficChange.SpeedLimitWorkZone,
      applicant: {
        create: {
          name: 'Demo Applicant',
          type: ApplicantType.Business,
          phoneNumber: '+45 12 34 56 78',
          email: 'demo@example.com',
          mitIdKey: 'demo-mitid-key',
          address: {
            create: {
              street: 'Demo Street',
              houseNumber: '1',
              postalCode: '1000',
              city: 'København',
            },
          },
        },
      },
      roadUsePermit: {
        create: {
          caseNumber,
          title: 'Demo road use permit',
          applicantReference: 'DEMO-APPLICANT-0001',
          type: ApplicationType.RoadUsePermit,
          isEvent: false,
          startDate: new Date('2026-01-01T08:00:00.000Z'),
          endDate: new Date('2026-12-31T17:00:00.000Z'),
          eventStart: new Date('2026-01-01T08:00:00.000Z'),
          eventEnd: new Date('2026-12-31T17:00:00.000Z'),
          usage: Usage.SignInstallment,
        },
      },
      excavationPermit: {
        create: {
          caseNumber,
          title: 'Demo excavation permit',
          applicantReference: 'DEMO-APPLICANT-0001',
          type: ApplicationType.ExcavationPermit,
          permitType: PermitType.Application,
          startDate: new Date('2026-01-01T08:00:00.000Z'),
          endDate: new Date('2026-12-31T17:00:00.000Z'),
        },
      },
    },
  });

  const signPlan = await prisma.signPlan.upsert({
    where: { uuid: signPlanUuid },
    update: {},
    create: {
      uuid: signPlanUuid,
      name: 'Demo sign plan',
      documentType: DocumentType.SignPlan,
      url: 'https://example.com/demo-sign-plan.pdf',
      signPlanType: SignPlanType.MarkingCityArea,
      group: 'Demo group',
      plan: 'Demo plan',
      application: {
        connect: { caseNumber },
      },
    },
  });

  console.log('Seeded application:', application.caseNumber);
  console.log('Seeded sign plan:', signPlan.uuid);
}

try {
  await seed();
} finally {
  await prisma.$disconnect();
}
