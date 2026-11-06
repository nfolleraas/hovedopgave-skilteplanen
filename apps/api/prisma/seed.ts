import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  ApplicantType,
  ApplicationType,
  PermitType,
  Status,
  TrafficChange,
  Usage,
} from '../src/generated/prisma/enums.js';

// One draft application per application type, used by the Kort and Områder
// steps at /ansoegning?sag=<caseNumber>.
const draftApplications = [
  { caseNumber: 'DEV-GRAVE-1', type: ApplicationType.ExcavationPermit },
  { caseNumber: 'DEV-ROV-1', type: ApplicationType.RoadUsePermit },
] as const;

export async function seed(prisma: PrismaClient) {
  const start = new Date('2027-01-04T07:00:00Z');
  const end = new Date('2027-01-15T15:00:00Z');

  for (const [index, draft] of draftApplications.entries()) {
    const { caseNumber, type } = draft;
    const title = `Udviklingsansøgning ${caseNumber}`;

    // The schema allows one application per applicant, so each draft gets
    // its own applicant.
    const applicant = await prisma.applicant.upsert({
      where: { addressId: `dev-address-${index}` },
      update: {},
      create: {
        name: `Testansøger ${index + 1}`,
        type: ApplicantType.Business,
        phoneNumber: '12345678',
        email: `test${index + 1}@example.com`,
        mitIdKey: `dev-mitid-${index}`,
        address: {
          create: {
            uuid: `dev-address-${index}`,
            street: 'Cikorievej',
            houseNumber: String(index + 1),
            postalCode: '5220',
            city: 'Odense SØ',
          },
        },
      },
    });

    // An application currently requires both permit records.
    await prisma.excavationPermit.upsert({
      where: { caseNumber: `${caseNumber}-GT` },
      update: {},
      create: {
        caseNumber: `${caseNumber}-GT`,
        title,
        applicantReference: caseNumber,
        type,
        permitType: PermitType.Application,
        startDate: start,
        endDate: end,
      },
    });
    await prisma.roadUsePermit.upsert({
      where: { caseNumber: `${caseNumber}-ROV` },
      update: {},
      create: {
        caseNumber: `${caseNumber}-ROV`,
        title,
        applicantReference: caseNumber,
        type,
        // Events are not supported, so this is always false.
        isEvent: false,
        startDate: start,
        endDate: end,
        eventStart: start,
        eventEnd: end,
        usage: Usage.Construction,
      },
    });
    await prisma.application.upsert({
      where: { caseNumber },
      update: { status: Status.Draft },
      create: {
        caseNumber,
        title,
        applicantReference: caseNumber,
        type,
        status: Status.Draft,
        trafficChange: TrafficChange.SpeedLimitWorkZone,
        applicantId: applicant.uuid,
        excavationPermitId: `${caseNumber}-GT`,
        roadUsePermitId: `${caseNumber}-ROV`,
      },
    });
  }
}

if (import.meta.main) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL must be set to seed the database.');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    await seed(prisma);
    console.log('Seeded draft applications for the area steps.');
  } finally {
    await prisma.$disconnect();
  }
}
