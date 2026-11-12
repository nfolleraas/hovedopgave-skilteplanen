import { Injectable } from '@nestjs/common';
import type { SupportedApplicationType } from '../../common/application-types.js';
import {
  ActorRole,
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
  contactPersonCount: number;
}

const devAddress = {
  street: 'Cikorievej',
  houseNumber: '1',
  postalCode: '5220',
  city: 'Odense SØ',
};

const devActors = [
  {
    name: 'Testentreprenør A/S',
    role: ActorRole.Contractor,
    phoneNumber: '11111111',
    cvrNumber: '11111111',
  },
  {
    name: 'Testledningsejer A/S',
    role: ActorRole.NetworkOperator,
    phoneNumber: '22222222',
    cvrNumber: '22222222',
  },
];

const caseNumberPrefix: Record<SupportedApplicationType, string> = {
  ExcavationPermit: 'DEV-GRAVE',
  RoadUsePermit: 'DEV-ROV',
};

/**
 * Test-only: lists applications and creates draft applications with the
 * placeholder records the schema requires, plus two actors that contact
 * persons can be added to. Not registered in production.
 */
@Injectable()
export class DevApplicationsService {
  constructor(private readonly repository: DevApplicationsRepository) {}

  async findAll(): Promise<DevApplicationSummary[]> {
    const applications = await this.repository.getAllWithCounts();
    return applications.map(({ _count, ...application }) => ({
      ...application,
      contactPersonCount: _count.contactPersons,
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

    await this.repository.addWithApplicant(
      {
        name: `Testansøger ${caseNumber}`,
        type: ApplicantType.Business,
        phoneNumber: '12345678',
        email: `${caseNumber.toLowerCase()}@example.com`,
        mitIdKey: `dev-mitid-${caseNumber}`,
        address: { create: devAddress },
      },
      // Each permit shares the application's case number.
      {
        caseNumber,
        title,
        applicantReference: caseNumber,
        type,
        status: Status.Draft,
        trafficChange: TrafficChange.SpeedLimitWorkZone,
        // Contact persons belong to an actor, and the actors step is not on
        // this branch, so two test actors are created with the application.
        actors: {
          create: devActors.map((actor) => ({
            ...actor,
            email: `${actor.role.toLowerCase()}.${caseNumber.toLowerCase()}@example.com`,
            address: { create: devAddress },
          })),
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

    return {
      caseNumber,
      title,
      type,
      status: Status.Draft,
      contactPersonCount: 0,
    };
  }

  /** The next free number, e.g. DEV-GRAVE-4 when DEV-GRAVE-1..3 exist. */
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
