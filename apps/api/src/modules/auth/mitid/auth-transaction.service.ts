import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthTransaction } from '../../../generated/prisma/client.js';
import { AuthTransactionRepository } from './auth-transaction.repository.js';
import type { MitidLoginType } from './mitid.types.js';

const TRANSACTION_TTL_MILLISECONDS = 10 * 60 * 1_000;
const RANDOM_VALUE_BYTE_LENGTH = 32;

export type CreatedAuthTransaction = {
  state: string;
  nonce: string;
  codeChallenge: string;
};

@Injectable()
export class AuthTransactionService {
  /**
   * Creates the service that generates and consumes OIDC correlation values.
   * @param repository - The persistence boundary for one-time transactions.
   */
  constructor(private readonly repository: AuthTransactionRepository) {}

  /**
   * Creates a short-lived Signicat transaction with random state, nonce, and PKCE.
   * @param loginType - The server-selected private or business login context.
   * @param returnPath - The validated local path to retain across authentication.
   * @returns The raw redirect values while persisting only state and nonce hashes.
   */
  async create(
    loginType: MitidLoginType,
    returnPath: string | null,
  ): Promise<CreatedAuthTransaction> {
    const state = randomBytes(RANDOM_VALUE_BYTE_LENGTH).toString('base64url');
    const nonce = randomBytes(RANDOM_VALUE_BYTE_LENGTH).toString('base64url');
    const pkceVerifier = randomBytes(RANDOM_VALUE_BYTE_LENGTH).toString(
      'base64url',
    );

    await this.repository.create({
      loginType,
      stateHash: hashValue(state),
      nonceHash: hashValue(nonce),
      pkceVerifier,
      returnPath,
      expiresAt: new Date(Date.now() + TRANSACTION_TTL_MILLISECONDS),
    });

    return {
      state,
      nonce,
      codeChallenge: createHash('sha256')
        .update(pkceVerifier)
        .digest('base64url'),
    };
  }

  /**
   * Consumes exactly one transaction matching an untrusted callback state value.
   * @param state - The state query value returned to the callback.
   * @returns The valid transaction containing its original login context and PKCE verifier.
   * @throws UnauthorizedException when state is missing, unknown, expired, or reused.
   */
  async consume(state: unknown): Promise<AuthTransaction> {
    if (typeof state !== 'string' || state.length === 0) {
      throw invalidOidcTransaction();
    }

    const transaction = await this.repository.consume(
      hashValue(state),
      new Date(),
    );

    if (!transaction) {
      throw invalidOidcTransaction();
    }

    return transaction;
  }
}

/**
 * Hashes one OIDC correlation value for persistence and lookup.
 * @param value - The raw state or nonce value.
 * @returns The SHA-256 digest as lowercase hexadecimal.
 */
function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Creates the generic error used for every invalid transaction condition.
 * @returns An unauthorized exception that does not reveal transaction state.
 */
function invalidOidcTransaction(): UnauthorizedException {
  return new UnauthorizedException('Invalid or expired login transaction.');
}
