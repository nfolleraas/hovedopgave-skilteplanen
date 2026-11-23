import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { VerifiedKeycloakIdentity } from './municipality.types.js';

@Injectable()
export class MunicipalityCaseWorkerRepository {
  constructor(private readonly prisma: PrismaService) {}

  findLinkedIdentity(identity: VerifiedKeycloakIdentity) {
    return this.prisma.caseWorkerExternalIdentity.findFirst({
      where: {
        subject: identity.subject,
        municipalityProvider: {
          provider: 'KEYCLOAK',
          issuer: identity.issuer,
          municipalityClaim: identity.municipalityClaim,
        },
      },
      select: {
        caseWorker: {
          select: { employeeNumber: true, municipalityId: true },
        },
        municipalityProvider: {
          select: { municipalityId: true },
        },
      },
    });
  }
}
