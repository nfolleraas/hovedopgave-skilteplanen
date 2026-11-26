import { ConflictException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';

/**
 * Maps applicant uniqueness violations to HTTP conflicts and rethrows others.
 *
 * @param error - Error from an applicant database write.
 * @param options - Whether known duplicate fields should be included in the error.
 */
export function mapApplicantCreateError(
  error: unknown,
  options?: { includeField: boolean },
): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    const target = Array.isArray(error.meta?.target)
      ? error.meta.target.join(',')
      : String(error.meta?.target ?? '');

    if (
      target.includes('email') ||
      target.includes('Applicant_email') ||
      target.includes('email_lower')
    ) {
      const message = 'Der findes allerede en ansøger med den e-mail.';
      throw new ConflictException(
        options?.includeField ? { message, fields: ['email'] } : message,
      );
    }

    if (
      target.includes('cvrNumber') ||
      target.includes('Applicant_cvr') ||
      target.includes('cvr_number')
    ) {
      const message = 'Der findes allerede en ansøger med det CVR-nummer.';
      throw new ConflictException(
        options?.includeField ? { message, fields: ['cvrNumber'] } : message,
      );
    }

    throw new ConflictException('Ansøger findes allerede.');
  }

  throw error;
}
