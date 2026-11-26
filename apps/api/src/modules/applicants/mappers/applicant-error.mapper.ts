import { ConflictException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';

/**
 * Maps Prisma errors for applicant writes into user-friendly HTTP exceptions.
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
