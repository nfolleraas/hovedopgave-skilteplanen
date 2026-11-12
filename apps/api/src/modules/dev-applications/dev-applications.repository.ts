import { Injectable } from '@nestjs/common';
import { Application, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type ApplicationWithCounts = Pick<
  Application,
  'caseNumber' | 'title' | 'type' | 'status'
> & { _count: { contactPersons: number } };

/** Test-only data access for the dev applications module. */
@Injectable()
export class DevApplicationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getAllWithCounts(): Promise<ApplicationWithCounts[]> {
    return await this.prisma.application.findMany({
      select: {
        caseNumber: true,
        title: true,
        type: true,
        status: true,
        _count: { select: { contactPersons: true } },
      },
      orderBy: { caseNumber: 'asc' },
    });
  }

  async getCaseNumbersStartingWith(prefix: string): Promise<string[]> {
    const applications = await this.prisma.application.findMany({
      where: { caseNumber: { startsWith: prefix } },
      select: { caseNumber: true },
    });
    return applications.map(({ caseNumber }) => caseNumber);
  }

  /** Creates the applicant and its application in one transaction. */
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
