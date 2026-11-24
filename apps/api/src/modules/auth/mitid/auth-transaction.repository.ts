import { Injectable } from '@nestjs/common';
import type { AuthTransaction } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { MitidLoginType } from './mitid.types.js';

type CreateAuthTransactionInput = {
  loginType: MitidLoginType;
  stateHash: string;
  nonceHash: string;
  pkceVerifier: string;
  returnPath: string | null;
  expiresAt: Date;
};

@Injectable()
export class AuthTransactionRepository {
  /**
   * Creates the OIDC transaction repository backed by the application Prisma client.
   * @param prisma - The database client used by this repository only.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persists one Signicat authorization transaction before redirecting the browser.
   * @param input - The hashed correlation values, PKCE verifier, context, and expiry.
   * @returns The stored authorization transaction.
   */
  create(input: CreateAuthTransactionInput): Promise<AuthTransaction> {
    return this.prisma.authTransaction.create({
      data: {
        provider: 'SIGNICAT',
        loginType: input.loginType,
        stateHash: input.stateHash,
        nonceHash: input.nonceHash,
        pkceVerifier: input.pkceVerifier,
        returnPath: input.returnPath,
        expiresAt: input.expiresAt,
      },
    });
  }

  /**
   * Atomically marks one unexpired Signicat transaction as consumed.
   * @param stateHash - The SHA-256 hash of the state returned by Signicat.
   * @param consumedAt - The callback processing time used for expiry and consumption.
   * @returns The consumed transaction, or null when it is unknown, expired, or reused.
   */
  consume(
    stateHash: string,
    consumedAt: Date,
  ): Promise<AuthTransaction | null> {
    return this.prisma.$transaction(async (transaction) => {
      const consumption = await transaction.authTransaction.updateMany({
        where: {
          stateHash,
          provider: 'SIGNICAT',
          consumedAt: null,
          expiresAt: { gt: consumedAt },
        },
        data: { consumedAt },
      });

      if (consumption.count !== 1) {
        return null;
      }

      return transaction.authTransaction.findUniqueOrThrow({
        where: { stateHash },
      });
    });
  }
}
