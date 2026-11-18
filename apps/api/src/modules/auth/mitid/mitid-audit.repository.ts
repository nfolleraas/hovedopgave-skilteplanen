import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export type BusinessLoginAuditIdentity = {
  organisationCvr: string;
  employeeUuid: string;
  providerSubject: string;
};

@Injectable()
export class MitidAuditRepository {
  /**
   * Creates the MitID audit repository backed by the application Prisma client.
   * @param prisma - The database client used by this repository only.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records which verified employee authenticated for a business applicant.
   * @param applicantId - The shared business applicant receiving the session.
   * @param identity - The verified organization, employee, and provider subject.
   * @returns A promise that resolves after the audit event is stored.
   */
  recordBusinessLoginSuccess(
    applicantId: string,
    identity: BusinessLoginAuditIdentity,
  ): Promise<void> {
    return this.prisma.authAuditEvent
      .create({
        data: {
          eventType: 'LOGIN_SUCCESS',
          actor: 'APPLICANT',
          principalId: applicantId,
          provider: 'SIGNICAT',
          success: true,
          metadata: {
            loginType: 'BUSINESS_APPLICANT',
            cvrNumber: identity.organisationCvr,
            employeeUuid: identity.employeeUuid,
            providerSubject: identity.providerSubject,
          },
        },
      })
      .then(() => undefined);
  }
}
