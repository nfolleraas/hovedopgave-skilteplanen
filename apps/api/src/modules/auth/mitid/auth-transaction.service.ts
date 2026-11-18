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
  constructor(private readonly repository: AuthTransactionRepository) {}

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

function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function invalidOidcTransaction(): UnauthorizedException {
  return new UnauthorizedException('Invalid or expired login transaction.');
}
