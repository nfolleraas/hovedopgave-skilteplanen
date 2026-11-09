import type { SupportedApplicationType } from '../../src/common/application-types.js';
import {
  ApplicantType,
  ApplicationType,
  PermitType,
  Status,
  TrafficChange,
  Usage,
} from '../../src/generated/prisma/enums.js';
import type { PrismaService } from '../../src/prisma/prisma.service.js';

/**
 * Creates applications for e2e tests in the development database and removes
 * them again. Case numbers start with a unique prefix, so the tests never
 * touch seeded or manually created data.
 */
export class TestApplications {
  private readonly prefix = `E2E-AREAS-${Date.now()}`;
  private count = 0;

  constructor(private readonly prisma: PrismaService) {}

  async create(
    type: SupportedApplicationType,
    status: Status = Status.Draft,
  ): Promise<string> {
    this.count += 1;
    const caseNumber = `${this.prefix}-${this.count}`;
    const start = new Date('2027-01-04T07:00:00.000Z');
    const end = new Date('2027-01-18T15:00:00.000Z');

    await this.prisma.application.create({
      data: {
        caseNumber,
        title: `E2E ${caseNumber}`,
        applicantReference: caseNumber,
        type,
        status,
        trafficChange: TrafficChange.SpeedLimitWorkZone,
        applicant: {
          create: {
            name: `E2E ${caseNumber}`,
            type: ApplicantType.Business,
            phoneNumber: '12345678',
            email: `${caseNumber.toLowerCase()}@example.com`,
            mitIdKey: `e2e-${caseNumber}`,
            address: {
              create: {
                street: 'Testvej',
                houseNumber: '1',
                postalCode: '5000',
                city: 'Odense C',
              },
            },
          },
        },
        ...(type === ApplicationType.ExcavationPermit
          ? {
              excavationPermit: {
                create: {
                  applicationId: caseNumber,
                  permitType: PermitType.Application,
                  startDate: start,
                  endDate: end,
                },
              },
            }
          : {
              roadUsePermit: {
                create: {
                  applicationId: caseNumber,
                  isEvent: false,
                  startDate: start,
                  endDate: end,
                  eventStart: start,
                  eventEnd: end,
                  usage: Usage.Construction,
                },
              },
            }),
      },
    });

    return caseNumber;
  }

  async setStatus(caseNumber: string, status: Status): Promise<void> {
    await this.prisma.application.update({
      where: { caseNumber },
      data: { status },
    });
  }

  /** Removes every application this instance created, with its areas. */
  async removeAll(): Promise<void> {
    const where = { caseNumber: { startsWith: this.prefix } };
    const applications = await this.prisma.application.findMany({
      where,
      select: {
        applicantId: true,
        applicant: { select: { addressId: true } },
      },
    });
    const areas = await this.prisma.area.findMany({
      where: { applicationId: { startsWith: this.prefix } },
      select: { areaDetailId: true, areaSizeId: true },
    });

    await this.prisma.$transaction([
      this.prisma.area.deleteMany({
        where: { applicationId: { startsWith: this.prefix } },
      }),
      this.prisma.areaDetail.deleteMany({
        where: { uuid: { in: ids(areas.map((area) => area.areaDetailId)) } },
      }),
      this.prisma.areaSize.deleteMany({
        where: { uuid: { in: ids(areas.map((area) => area.areaSizeId)) } },
      }),
      // Permits are removed by the database (onDelete: Cascade).
      this.prisma.application.deleteMany({ where }),
      this.prisma.applicant.deleteMany({
        where: { uuid: { in: applications.map((app) => app.applicantId) } },
      }),
      this.prisma.address.deleteMany({
        where: {
          uuid: { in: applications.map((app) => app.applicant.addressId) },
        },
      }),
    ]);
  }
}

function ids(values: (string | null)[]): string[] {
  return values.filter((value): value is string => value !== null);
}
