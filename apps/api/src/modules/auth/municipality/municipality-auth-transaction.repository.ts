import { Injectable } from '@nestjs/common';
import type { AuthTransaction } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

type CreateMunicipalityAuthTransactionInput = {
  stateHash: string;
  nonceHash: string;
  pkceVerifier: string;
  returnPath: string | null;
  expiresAt: Date;
};

@Injectable()
export class MunicipalityAuthTransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    input: CreateMunicipalityAuthTransactionInput,
  ): Promise<AuthTransaction> {
    return this.prisma.authTransaction.create({
      data: {
        provider: 'KEYCLOAK',
        loginType: 'MUNICIPALITY',
        stateHash: input.stateHash,
        nonceHash: input.nonceHash,
        pkceVerifier: input.pkceVerifier,
        returnPath: input.returnPath,
        expiresAt: input.expiresAt,
      },
    });
  }

  consume(
    stateHash: string,
    consumedAt: Date,
  ): Promise<AuthTransaction | null> {
    return this.prisma.$transaction(async (transaction) => {
      const consumption = await transaction.authTransaction.updateMany({
        where: {
          stateHash,
          provider: 'KEYCLOAK',
          loginType: 'MUNICIPALITY',
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
