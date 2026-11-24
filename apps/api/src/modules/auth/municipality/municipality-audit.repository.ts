import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { VerifiedKeycloakIdentity } from './municipality.types.js';

@Injectable()
export class MunicipalityAuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async recordLoginSuccess(
    employeeNumber: string,
    identity: VerifiedKeycloakIdentity,
  ): Promise<void> {
    await this.prisma.authAuditEvent.create({
      data: {
        eventType: 'LOGIN_SUCCESS',
        actor: 'CASE_WORKER',
        principalId: employeeNumber,
        provider: 'KEYCLOAK',
        success: true,
        metadata: {
          loginType: 'MUNICIPALITY',
          providerSubject: identity.subject,
          municipalityClaim: identity.municipalityClaim,
        },
      },
    });
  }
}
