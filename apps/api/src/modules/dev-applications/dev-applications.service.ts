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
import { DevApplicationsRepository } from './dev-applications.repository.js';

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
  /**
   * Creates the service for test-only applications.
   * @param repository - Repository for application data access
   */
  constructor(private readonly repository: DevApplicationsRepository) {}

  /**
   * Lists all applications with their number of areas.
   * @returns A summary of each application
   */
  async findAll(): Promise<DevApplicationSummary[]> {
    const applications = await this.repository.getAllWithAreaCount();
    return applications.map(({ _count, ...application }) => ({
      ...application,
      areaCount: _count.areas,
    }));
  }

  /**
   * Creates a draft application with a placeholder applicant, period and
   * permit, so areas can be tested without the full application flow.
   * @param type - The type of application to create
   * @returns A summary of the created application
   */
  async create(type: SupportedApplicationType): Promise<DevApplicationSummary> {
    const caseNumber = await this.nextCaseNumber(type);
    const title = `Testansøgning ${caseNumber}`;
    // Placeholder period until the period step is saved to the database.
    const start = new Date();
    start.setDate(start.getDate() + 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 14);

    await this.repository.addWithApplicant(
      {
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
      // Each permit shares the application's case number.
      {
        caseNumber,
        title,
        applicantReference: caseNumber,
        type,
        status: Status.Draft,
        trafficChanges: [TrafficChange.SpeedLimitWorkZone],
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
                  // Events are not supported, so this is always false.
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
    );

    return { caseNumber, title, type, status: Status.Draft, areaCount: 0 };
  }

  /**
   * Finds the next free case number for a type, e.g. DEV-GRAVE-4 when
   * DEV-GRAVE-1..3 exist.
   * @param type - The application type, which decides the prefix
   * @returns The next free case number
   */
  private async nextCaseNumber(
    type: SupportedApplicationType,
  ): Promise<string> {
    const prefix = caseNumberPrefix[type];
    const existing = await this.repository.getCaseNumbersStartingWith(
      `${prefix}-`,
    );
    const numbers = existing
      .map((caseNumber) => Number(caseNumber.slice(prefix.length + 1)))
      .filter(Number.isInteger);
    return `${prefix}-${Math.max(0, ...numbers) + 1}`;
  }
}
