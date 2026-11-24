import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class AdminRepository {
  /**
   * Creates the repository backed by the application Prisma client.
   * @param prisma - The database client used by this repository only.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds the password-verification data for a normalized administrator e-mail.
   * @param email - The normalized administrator e-mail address.
   * @returns The login record, or null when no administrator has the e-mail.
   */
  findByEmail(
    email: string,
  ): Promise<{ uuid: string; passwordHash: string } | null> {
    return this.prisma.administrator.findUnique({
      where: { email },
      select: { uuid: true, passwordHash: true },
    });
  }

  /**
   * Records a successful local administrator login.
   * @param administratorId - The authenticated administrator UUID.
   * @param ipAddress - The source IP address when available.
   * @returns A promise that resolves after the audit event is stored.
   */
  recordLoginSuccess(
    administratorId: string,
    ipAddress?: string,
  ): Promise<void> {
    return this.prisma.authAuditEvent
      .create({
        data: {
          eventType: 'LOGIN_SUCCESS',
          actor: 'ADMINISTRATOR',
          principalId: administratorId,
          provider: 'LOCAL',
          success: true,
          ...(ipAddress === undefined ? {} : { ipAddress }),
        },
      })
      .then(() => undefined);
  }

  /**
   * Records a failed local administrator login without retaining submitted credentials.
   * @param administratorId - The matched administrator UUID when one exists.
   * @param ipAddress - The source IP address when available.
   * @param reason - The safe failure category retained in audit metadata.
   * @returns A promise that resolves after the audit event is stored.
   */
  recordLoginFailure(
    administratorId: string | undefined,
    ipAddress: string | undefined,
    reason: 'invalid_credentials' | 'rate_limited',
  ): Promise<void> {
    return this.prisma.authAuditEvent
      .create({
        data: {
          eventType: 'LOGIN_FAILURE',
          provider: 'LOCAL',
          success: false,
          metadata: { reason },
          ...(administratorId === undefined
            ? {}
            : { actor: 'ADMINISTRATOR', principalId: administratorId }),
          ...(ipAddress === undefined ? {} : { ipAddress }),
        },
      })
      .then(() => undefined);
  }
}
