import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { AuthTransaction } from '../../../generated/prisma/client.js';
import type { CreatedMunicipalityAuthTransaction } from './municipality.types.js';
import { MunicipalityAuthTransactionRepository } from './municipality-auth-transaction.repository.js';

const TRANSACTION_TTL_MILLISECONDS = 10 * 60 * 1_000;
const RANDOM_VALUE_BYTE_LENGTH = 32;

@Injectable()
export class MunicipalityAuthTransactionService {
  constructor(
    private readonly repository: MunicipalityAuthTransactionRepository,
  ) {}

  async create(
    returnPath: string | null,
  ): Promise<CreatedMunicipalityAuthTransaction> {
    const state = randomBytes(RANDOM_VALUE_BYTE_LENGTH).toString('base64url');
    const nonce = randomBytes(RANDOM_VALUE_BYTE_LENGTH).toString('base64url');
    const pkceVerifier = randomBytes(RANDOM_VALUE_BYTE_LENGTH).toString(
      'base64url',
    );

    await this.repository.create({
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
      throw invalidTransaction();
    }

    const transaction = await this.repository.consume(
      hashValue(state),
      new Date(),
    );

    if (!transaction) {
      throw invalidTransaction();
    }

    return transaction;
  }
}

function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function invalidTransaction(): UnauthorizedException {
  return new UnauthorizedException('Invalid or expired login transaction.');
}
