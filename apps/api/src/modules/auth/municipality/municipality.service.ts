import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  KEYCLOAK_CONFIG,
  type KeycloakConfig,
} from '../../../config/keycloak.config.js';
import { RefreshTokenService } from '../refresh-token/refresh-token.service.js';
import { KeycloakProvider } from './keycloak.provider.js';
import type {
  CompletedMunicipalityAuthentication,
  MunicipalityOidcCallbackInput,
  VerifiedKeycloakIdentity,
} from './municipality.types.js';
import { MunicipalityAuditRepository } from './municipality-audit.repository.js';
import { MunicipalityAuthTransactionService } from './municipality-auth-transaction.service.js';
import { MunicipalityCaseWorkerRepository } from './municipality-case-worker.repository.js';

@Injectable()
export class MunicipalityService {
  constructor(
    private readonly transactions: MunicipalityAuthTransactionService,
    private readonly keycloak: KeycloakProvider,
    private readonly caseWorkers: MunicipalityCaseWorkerRepository,
    private readonly audit: MunicipalityAuditRepository,
    private readonly refreshTokens: RefreshTokenService,
    @Inject(KEYCLOAK_CONFIG) private readonly config: KeycloakConfig,
  ) {}

  async start(returnPath?: unknown): Promise<string> {
    const safeReturnPath = validateReturnPath(returnPath);
    const transaction = await this.transactions.create(safeReturnPath);

    try {
      return await this.keycloak.createAuthorizationUrl(transaction);
    } catch {
      throw new ServiceUnavailableException(
        'Municipality authentication is unavailable.',
      );
    }
  }

  async callback(
    input: MunicipalityOidcCallbackInput,
  ): Promise<CompletedMunicipalityAuthentication> {
    const transaction = await this.transactions.consume(input.state);

    if (typeof input.error === 'string' && input.error.length > 0) {
      throw new UnauthorizedException('Identity provider rejected the login.');
    }

    if (typeof input.code !== 'string' || input.code.length === 0) {
      throw new UnauthorizedException('Invalid identity provider response.');
    }

    let identity: VerifiedKeycloakIdentity;

    try {
      identity = await this.keycloak.completeAuthorization(
        input.code,
        transaction.pkceVerifier,
        transaction.nonceHash,
      );
    } catch {
      throw new UnauthorizedException('Invalid identity provider response.');
    }

    const requiredRole = this.enabledConfig().requiredRole;

    if (!identity.roles.includes(requiredRole)) {
      throw unavailableCaseWorker();
    }

    const linkedIdentity = await this.caseWorkers.findLinkedIdentity(identity);

    if (
      !linkedIdentity ||
      linkedIdentity.caseWorker.municipalityId !==
        linkedIdentity.municipalityProvider.municipalityId
    ) {
      throw unavailableCaseWorker();
    }

    const employeeNumber = linkedIdentity.caseWorker.employeeNumber;
    const session = await this.refreshTokens.issue({
      subject: employeeNumber,
      actor: 'CASE_WORKER',
    });
    await this.audit.recordLoginSuccess(employeeNumber, identity);

    return {
      loginType: 'MUNICIPALITY',
      returnPath: transaction.returnPath,
      status: 'authenticated',
      session,
    };
  }

  private enabledConfig(): Extract<KeycloakConfig, { enabled: true }> {
    if (!this.config.enabled) {
      throw new ServiceUnavailableException(
        'Municipality authentication is unavailable.',
      );
    }

    return this.config;
  }
}

function validateReturnPath(value: unknown): string | null {
  if (value === undefined) {
    return null;
  }

  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > 2_048 ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    throw new BadRequestException('Invalid return path.');
  }

  return value;
}

function unavailableCaseWorker(): ForbiddenException {
  return new ForbiddenException(
    'Case-worker account is unavailable. Contact the municipality superuser.',
  );
}
