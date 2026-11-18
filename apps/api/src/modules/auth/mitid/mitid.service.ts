import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthTransactionService } from './auth-transaction.service.js';
import type {
  CompletedMitidAuthentication,
  MitidLoginType,
  OidcCallbackInput,
} from './mitid.types.js';
import { SignicatProvider } from './signicat.provider.js';

@Injectable()
export class MitidService {
  constructor(
    private readonly transactions: AuthTransactionService,
    private readonly signicat: SignicatProvider,
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

    try {
      const identity = await this.signicat.completeAuthorization(
        input.code,
        transaction.pkceVerifier,
        transaction.nonceHash,
      );

      return {
        loginType: transaction.loginType as MitidLoginType,
        returnPath: transaction.returnPath,
        identity,
      };
    } catch {
      throw new UnauthorizedException('Invalid identity provider response.');
    }
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
