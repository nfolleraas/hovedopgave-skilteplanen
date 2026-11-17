import { Injectable } from '@nestjs/common';
import type {
  AuthAuditEventType,
  Prisma,
} from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  CreateRefreshTokenInput,
  RefreshTokenPrincipal,
  RefreshTokenRotationResult,
  RotateRefreshTokenInput,
} from './refresh-token.types.js';

@Injectable()
export class RefreshTokenRepository {
  /**
   * Creates a refresh-token repository backed by the application Prisma client.
   * @param prisma - The database client used by this repository only.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persists a hashed refresh token when the principal is still eligible.
   * @param input - The token hash, principal, and absolute expiry.
   * @returns True when the token was created.
   */
  create(input: CreateRefreshTokenInput): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      if (!(await this.principalIsEligible(transaction, input.principal))) {
        return false;
      }

      await transaction.refreshToken.create({
        data: {
          tokenHash: input.tokenHash,
          principalId: input.principal.subject,
          actor: input.principal.actor,
          expiresAt: input.expiresAt,
        },
      });

      return true;
    });
  }

  /**
   * Atomically replaces one valid refresh token and records the outcome.
   * @param input - The current hash, replacement data, and rotation timestamp.
   * @returns The principal and expiry after rotation, or an invalid result.
   */
  rotate(input: RotateRefreshTokenInput): Promise<RefreshTokenRotationResult> {
    return this.prisma.$transaction(async (transaction) => {
      const storedToken = await transaction.refreshToken.findUnique({
        where: { tokenHash: input.tokenHash },
      });

      if (!storedToken) {
        return { status: 'invalid' };
      }

      const principal: RefreshTokenPrincipal = {
        subject: storedToken.principalId,
        actor: storedToken.actor,
      };

      if (storedToken.replacedById !== null) {
        await this.recordAuditEvent(
          transaction,
          'REFRESH_REUSE',
          principal,
          false,
        );

        return { status: 'invalid' };
      }

      if (
        storedToken.revokedAt !== null ||
        storedToken.expiresAt <= input.rotatedAt
      ) {
        await this.recordAuditEvent(
          transaction,
          'REFRESH_FAILURE',
          principal,
          false,
          {
            reason:
              storedToken.revokedAt === null ? 'expired' : 'already_revoked',
          },
        );

        return { status: 'invalid' };
      }

      if (!(await this.principalIsEligible(transaction, principal))) {
        await transaction.refreshToken.updateMany({
          where: { uuid: storedToken.uuid, revokedAt: null },
          data: { revokedAt: input.rotatedAt },
        });
        await this.recordAuditEvent(
          transaction,
          'REFRESH_FAILURE',
          principal,
          false,
          { reason: 'principal_unavailable' },
        );

        return { status: 'invalid' };
      }

      await transaction.refreshToken.create({
        data: {
          uuid: input.replacementId,
          tokenHash: input.replacementHash,
          principalId: storedToken.principalId,
          actor: storedToken.actor,
          expiresAt: storedToken.expiresAt,
        },
      });

      const rotation = await transaction.refreshToken.updateMany({
        where: {
          uuid: storedToken.uuid,
          revokedAt: null,
          replacedById: null,
          expiresAt: { gt: input.rotatedAt },
        },
        data: {
          revokedAt: input.rotatedAt,
          replacedById: input.replacementId,
        },
      });

      if (rotation.count !== 1) {
        await transaction.refreshToken.delete({
          where: { uuid: input.replacementId },
        });
        await this.recordAuditEvent(
          transaction,
          'REFRESH_REUSE',
          principal,
          false,
        );

        return { status: 'invalid' };
      }

      await this.recordAuditEvent(
        transaction,
        'REFRESH_SUCCESS',
        principal,
        true,
      );

      return {
        status: 'rotated',
        principal,
        expiresAt: storedToken.expiresAt,
      };
    });
  }

  /**
   * Revokes one refresh token without revealing whether it existed.
   * @param tokenHash - The SHA-256 hash of the opaque token.
   * @param revokedAt - The revocation timestamp.
   */
  async revoke(tokenHash: string, revokedAt: Date): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const storedToken = await transaction.refreshToken.findUnique({
        where: { tokenHash },
      });

      if (!storedToken) {
        return;
      }

      const revocation = await transaction.refreshToken.updateMany({
        where: { uuid: storedToken.uuid, revokedAt: null },
        data: { revokedAt },
      });

      if (revocation.count === 1) {
        await this.recordAuditEvent(
          transaction,
          'LOGOUT',
          {
            subject: storedToken.principalId,
            actor: storedToken.actor,
          },
          true,
        );
      }
    });
  }

  /**
   * Revokes every active refresh token for one principal.
   * @param principal - The principal whose sessions should be revoked.
   * @param revokedAt - The revocation timestamp.
   * @returns The number of newly revoked tokens.
   */
  revokeAll(
    principal: RefreshTokenPrincipal,
    revokedAt: Date,
  ): Promise<number> {
    return this.prisma.$transaction(async (transaction) => {
      const revocation = await transaction.refreshToken.updateMany({
        where: {
          principalId: principal.subject,
          actor: principal.actor,
          revokedAt: null,
        },
        data: { revokedAt },
      });

      await this.recordAuditEvent(transaction, 'LOGOUT', principal, true, {
        scope: 'all',
        revokedTokenCount: revocation.count,
      });

      return revocation.count;
    });
  }

  /**
   * Checks whether a principal still exists and may authenticate.
   * @param transaction - The active Prisma transaction.
   * @param principal - The principal referenced by a refresh token.
   * @returns True when the current domain record is eligible.
   */
  private async principalIsEligible(
    transaction: Prisma.TransactionClient,
    principal: RefreshTokenPrincipal,
  ): Promise<boolean> {
    switch (principal.actor) {
      case 'APPLICANT': {
        const applicant = await transaction.applicant.findUnique({
          where: { uuid: principal.subject },
          select: { isActive: true },
        });

        return applicant?.isActive === true;
      }
      case 'CASE_WORKER': {
        const caseWorker = await transaction.caseWorker.findUnique({
          where: { employeeNumber: principal.subject },
          select: { employeeNumber: true },
        });

        return caseWorker !== null;
      }
      case 'ADMINISTRATOR': {
        const administrator = await transaction.administrator.findUnique({
          where: { uuid: principal.subject },
          select: { uuid: true },
        });

        return administrator !== null;
      }
    }
  }

  /**
   * Records a refresh-token security event without storing token material.
   * @param transaction - The active Prisma transaction.
   * @param eventType - The authentication event being recorded.
   * @param principal - The principal associated with the event.
   * @param success - Whether the operation succeeded.
   * @param metadata - Optional non-sensitive diagnostic context.
   */
  private async recordAuditEvent(
    transaction: Prisma.TransactionClient,
    eventType: AuthAuditEventType,
    principal: RefreshTokenPrincipal,
    success: boolean,
    metadata?: Prisma.InputJsonValue,
  ): Promise<void> {
    await transaction.authAuditEvent.create({
      data: {
        eventType,
        actor: principal.actor,
        principalId: principal.subject,
        success,
        ...(metadata === undefined ? {} : { metadata }),
      },
    });
  }
}
