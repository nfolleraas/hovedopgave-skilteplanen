import type { PrismaClient } from '../../src/generated/prisma/client.js';
import {
  ApplicantType,
  ApplicationType,
  PermitType,
  TrafficChange,
  Usage,
} from '../../src/generated/prisma/client.js';

export const demoCaseNumber = 'DEMO-2026-0001';

export async function seedApplication(prisma: PrismaClient) {
  return prisma.application.upsert({
    where: { caseNumber: demoCaseNumber },
    update: {},
    create: {
      caseNumber: demoCaseNumber,
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
          caseNumber: demoCaseNumber,
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
          caseNumber: demoCaseNumber,
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
}
