import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export type ApplicantLoginRecord = {
  uuid: string;
  isActive: boolean;
};

@Injectable()
export class MitidApplicantRepository {
  /**
   * Creates the MitID applicant lookup repository.
   * @param prisma - The database client used by this repository only.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds the private applicant linked to a stable MitID person identity.
   * @param mitidKey - The verified MitID UUID normalized by the provider adapter.
   * @returns The applicant session data, or null when no private applicant matches.
   */
  findPrivateByMitidKey(
    mitidKey: string,
  ): Promise<ApplicantLoginRecord | null> {
    return this.prisma.applicant.findFirst({
      where: { type: 'Private', mitIdKey: mitidKey },
      select: { uuid: true, isActive: true },
    });
  }

  // TODO: Move into applicant repository. This does not belong here.
  // Will be replaced when merged with implemented applicant module
  /**
   * Finds the shared business applicant identified by a verified organization CVR.
   * @param cvrNumber - The eight-digit CVR normalized by the provider adapter.
   * @returns The applicant session data, or null when no business applicant matches.
   */
  findBusinessByCvr(cvrNumber: string): Promise<ApplicantLoginRecord | null> {
    return this.prisma.applicant.findFirst({
      where: { type: 'Business', cvrNumber },
      select: { uuid: true, isActive: true },
    });
  }
}
