import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { RefreshTokenService } from '../refresh-token/refresh-token.service.js';
import { AuthTransactionService } from './auth-transaction.service.js';
import type {
  CompletedMitidAuthentication,
  MitidLoginType,
  OidcCallbackInput,
} from './mitid.types.js';
import { MitidApplicantRepository } from './mitid-applicant.repository.js';
import { MitidAuditRepository } from './mitid-audit.repository.js';
import { SignicatProvider } from './signicat.provider.js';

@Injectable()
export class MitidService {
  /**
   * Creates the MitID authentication orchestration service.
   * @param transactions - The service for one-time OIDC transaction handling.
   * @param signicat - The adapter for Signicat discovery, tokens, and identity claims.
   * @param applicants - The repository for private and business applicant lookup.
   * @param audit - The repository that records verified business employee logins.
   * @param refreshTokens - The service that creates authenticated applicant sessions.
   */
  constructor(
    private readonly transactions: AuthTransactionService,
    private readonly signicat: SignicatProvider,
    private readonly applicants: MitidApplicantRepository,
    private readonly audit: MitidAuditRepository,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  /**
   * Starts private-person authentication with server-controlled Signicat settings.
   * @param returnPath - An optional untrusted application return path.
   * @returns The Signicat authorization URL for the new transaction.
   */
  startPrivate(returnPath?: unknown): Promise<string> {
    return this.start('PRIVATE_APPLICANT', returnPath);
  }

  /**
   * Starts business authentication with server-controlled Signicat settings.
   * @param returnPath - An optional untrusted application return path.
   * @returns The Signicat authorization URL for the new transaction.
   */
  startBusiness(returnPath?: unknown): Promise<string> {
    return this.start('BUSINESS_APPLICANT', returnPath);
  }

  /**
   * Validates a Signicat callback and resolves its application authentication result.
   * @param input - The untrusted state, code, and provider error query values.
   * @returns A session for an active applicant or a registration-required result.
   * @throws UnauthorizedException when the transaction or provider response is invalid.
   * @throws ForbiddenException when the matched applicant is inactive.
   */
  async callback(
    input: OidcCallbackInput,
  ): Promise<CompletedMitidAuthentication> {
    const transaction = await this.transactions.consume(input.state);

    if (typeof input.error === 'string' && input.error.length > 0) {
      throw new UnauthorizedException('Identity provider rejected the login.');
    }

    if (typeof input.code !== 'string' || input.code.length === 0) {
      throw new UnauthorizedException('Invalid identity provider response.');
    }

    let identity: CompletedMitidAuthentication['identity'];

    try {
      identity = await this.signicat.completeAuthorization(
        input.code,
        transaction.pkceVerifier,
        transaction.nonceHash,
      );
    } catch {
      throw new UnauthorizedException('Invalid identity provider response.');
    }

    if (transaction.loginType === 'PRIVATE_APPLICANT') {
      return this.resolvePrivateApplicant(identity, transaction.returnPath);
    }

    return this.resolveBusinessApplicant(identity, transaction.returnPath);
  }

  /**
   * Resolves a business identity through verified organization and employee claims.
   * @param identity - The normalized Signicat identity containing CVR and employee UUID.
   * @param returnPath - The validated local path retained by the transaction.
   * @returns A business applicant session or a registration-required result.
   * @throws UnauthorizedException when required business relationship claims are absent.
   * @throws ForbiddenException when the matched business applicant is inactive.
   */
  private async resolveBusinessApplicant(
    identity: CompletedMitidAuthentication['identity'],
    returnPath: string | null,
  ): Promise<CompletedMitidAuthentication> {
    if (!identity.organisationCvr || !identity.employeeUuid) {
      throw new UnauthorizedException('Invalid identity provider response.');
    }

    const applicant = await this.applicants.findBusinessByCvr(
      identity.organisationCvr,
    );

    if (!applicant) {
      return {
        loginType: 'BUSINESS_APPLICANT',
        returnPath,
        identity,
        status: 'registration-required',
      };
    }

    if (!applicant.isActive) {
      throw new ForbiddenException('Applicant account is unavailable.');
    }

    const session = await this.refreshTokens.issue({
      subject: applicant.uuid,
      actor: 'APPLICANT',
    });
    await this.audit.recordBusinessLoginSuccess(applicant.uuid, {
      organisationCvr: identity.organisationCvr,
      employeeUuid: identity.employeeUuid,
      providerSubject: identity.subject,
    });

    return {
      loginType: 'BUSINESS_APPLICANT',
      returnPath,
      identity,
      status: 'authenticated',
      session,
    };
  }

  /**
   * Resolves a private identity through its stable MitID UUID.
   * @param identity - The normalized Signicat identity containing the MitID UUID.
   * @param returnPath - The validated local path retained by the transaction.
   * @returns A private applicant session or a registration-required result.
   * @throws UnauthorizedException when the stable MitID UUID is absent.
   * @throws ForbiddenException when the matched private applicant is inactive.
   */
  private async resolvePrivateApplicant(
    identity: CompletedMitidAuthentication['identity'],
    returnPath: string | null,
  ): Promise<CompletedMitidAuthentication> {
    if (!identity.mitidUuid) {
      throw new UnauthorizedException('Invalid identity provider response.');
    }

    const applicant = await this.applicants.findPrivateByMitidKey(
      identity.mitidUuid,
    );

    if (!applicant) {
      return {
        loginType: 'PRIVATE_APPLICANT',
        returnPath,
        identity,
        status: 'registration-required',
      };
    }

    if (!applicant.isActive) {
      throw new ForbiddenException('Applicant account is unavailable.');
    }

    const session = await this.refreshTokens.issue({
      subject: applicant.uuid,
      actor: 'APPLICANT',
    });

    return {
      loginType: 'PRIVATE_APPLICANT',
      returnPath,
      identity,
      status: 'authenticated',
      session,
    };
  }

  /**
   * Creates a transaction and builds the provider redirect for one login context.
   * @param loginType - The server-selected private or business login context.
   * @param returnPath - The optional untrusted local return path.
   * @returns The Signicat authorization URL.
   * @throws BadRequestException when the return path is unsafe.
   * @throws ServiceUnavailableException when Signicat cannot start authentication.
   */
  private async start(
    loginType: MitidLoginType,
    returnPath: unknown,
  ): Promise<string> {
    const safeReturnPath = validateReturnPath(returnPath);
    const transaction = await this.transactions.create(
      loginType,
      safeReturnPath,
    );

    try {
      return await this.signicat.createAuthorizationUrl({
        loginType,
        ...transaction,
      });
    } catch {
      throw new ServiceUnavailableException(
        'MitID authentication is unavailable.',
      );
    }
  }
}

/**
 * Accepts only application-local return paths to prevent open redirects.
 * @param value - The untrusted return-path query value.
 * @returns A validated local path, or null when the value is absent.
 * @throws BadRequestException when the value is external, malformed, or too long.
 */
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
