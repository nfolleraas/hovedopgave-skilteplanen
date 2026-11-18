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
import { SignicatProvider } from './signicat.provider.js';

@Injectable()
export class MitidService {
  constructor(
    private readonly transactions: AuthTransactionService,
    private readonly signicat: SignicatProvider,
    private readonly applicants: MitidApplicantRepository,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  startPrivate(returnPath?: unknown): Promise<string> {
    return this.start('PRIVATE_APPLICANT', returnPath);
  }

  startBusiness(returnPath?: unknown): Promise<string> {
    return this.start('BUSINESS_APPLICANT', returnPath);
  }

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

    return {
      loginType: transaction.loginType as MitidLoginType,
      returnPath: transaction.returnPath,
      identity,
      status: 'provider-authenticated',
    };
  }

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
