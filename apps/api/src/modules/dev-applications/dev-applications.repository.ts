import { Injectable } from '@nestjs/common';
import { Application, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type ApplicationWithAreaCount = Pick<
  Application,
  'caseNumber' | 'title' | 'type' | 'status'
> & { _count: { areas: number } };

/** Test-only data access for the dev applications module. */
@Injectable()
export class DevApplicationsRepository {
  /**
   * Creates the repository for test-only application data access.
   * @param prisma - Prisma client used for database queries
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gets all applications with their number of areas, ordered by case number.
   * @returns The applications with an area count
   */
  async getAllWithAreaCount(): Promise<ApplicationWithAreaCount[]> {
    return await this.prisma.application.findMany({
      select: {
        caseNumber: true,
        title: true,
        type: true,
        status: true,
        _count: { select: { areas: true } },
      },
      orderBy: { caseNumber: 'asc' },
    });
  }

  /**
   * Gets the case numbers that start with a prefix.
   * @param prefix - The prefix to match, e.g. `DEV-GRAVE-`
   * @returns The matching case numbers
   */
  async getCaseNumbersStartingWith(prefix: string): Promise<string[]> {
    const applications = await this.prisma.application.findMany({
      where: { caseNumber: { startsWith: prefix } },
      select: { caseNumber: true },
    });
    return applications.map(({ caseNumber }) => caseNumber);
  }

  /**
   * Creates the applicant and its application in one transaction.
   * @param applicant - The applicant to create
   * @param application - The application to create for the applicant
   * @returns A promise that resolves when both records are created
   */
  async addWithApplicant(
    applicant: Prisma.ApplicantCreateInput,
    application: Omit<Prisma.ApplicationCreateInput, 'applicant'>,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // The schema allows one application per applicant.
      const { uuid } = await tx.applicant.create({ data: applicant });
      await tx.application.create({
        data: { ...application, applicant: { connect: { uuid } } },
      });
    });
  }
}
