import { Injectable } from '@nestjs/common';
import type { SupportedApplicationType } from '../../common/application-types.js';
import {
  ApplicantType,
  ApplicationType,
  PermitType,
  Status,
  TrafficChange,
  Usage,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface DevApplicationSummary {
  caseNumber: string;
  title: string;
  type: ApplicationType;
  status: Status;
  areaCount: number;
}

const caseNumberPrefix: Record<SupportedApplicationType, string> = {
  ExcavationPermit: 'DEV-GRAVE',
  RoadUsePermit: 'DEV-ROV',
};

/**
 * Test-only: lists applications and creates draft applications with the
 * placeholder records the schema requires. Not registered in production.
 */
@Injectable()
export class DevApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<DevApplicationSummary[]> {
    const applications = await this.prisma.application.findMany({
      select: {
        caseNumber: true,
        title: true,
        type: true,
        status: true,
        _count: { select: { areas: true } },
      },
      orderBy: { caseNumber: 'asc' },
    });
    return applications.map(({ _count, ...application }) => ({
      ...application,
      areaCount: _count.areas,
    }));
  }

  async create(type: SupportedApplicationType): Promise<DevApplicationSummary> {
    const caseNumber = await this.nextCaseNumber(type);
    const title = `Testansøgning ${caseNumber}`;
    // Placeholder period until the period step is saved to the database.
    const start = new Date();
    start.setDate(start.getDate() + 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 14);

    await this.prisma.$transaction(async (tx) => {
      // The schema allows one application per applicant.
      const applicant = await tx.applicant.create({
        data: {
          name: `Testansøger ${caseNumber}`,
          type: ApplicantType.Business,
          phoneNumber: '12345678',
          email: `${caseNumber.toLowerCase()}@example.com`,
          mitIdKey: `dev-mitid-${caseNumber}`,
          address: {
            create: {
              street: 'Cikorievej',
              houseNumber: '1',
              postalCode: '5220',
              city: 'Odense SØ',
            },
          },
        },
      });
      // An application currently requires both permit records.
      await tx.excavationPermit.create({
        data: {
          caseNumber: `${caseNumber}-GT`,
          title,
          applicantReference: caseNumber,
          type,
          permitType: PermitType.Application,
          startDate: start,
          endDate: end,
        },
      });
      await tx.roadUsePermit.create({
        data: {
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
      await tx.application.create({
        data: {
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
    });

    return { caseNumber, title, type, status: Status.Draft, areaCount: 0 };
  }

  /** The next free number, e.g. DEV-GRAVE-4 when DEV-GRAVE-1..3 exist. */
  private async nextCaseNumber(
    type: SupportedApplicationType,
  ): Promise<string> {
    const prefix = caseNumberPrefix[type];
    const existing = await this.prisma.application.findMany({
      where: { caseNumber: { startsWith: `${prefix}-` } },
      select: { caseNumber: true },
    });
    const numbers = existing
      .map(({ caseNumber }) => Number(caseNumber.slice(prefix.length + 1)))
      .filter(Number.isInteger);
    return `${prefix}-${Math.max(0, ...numbers) + 1}`;
  }
}
