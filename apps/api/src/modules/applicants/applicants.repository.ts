import { Injectable } from '@nestjs/common';
import type { Applicant, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateApplicantDto } from './dto/create-applicant.dto.js';

const profileFields = {
  name: true,
  type: true,
  email: true,
  phoneNumber: true,
  cvrNumber: true,
} satisfies Prisma.ApplicantSelect;

export type ApplicantProfile = Prisma.ApplicantGetPayload<{
  select: typeof profileFields;
}>;

@Injectable()
export class ApplicantsRepository {
  /**
   * Creates a repository for applicant persistence.
   *
   * @param prisma - Database client used for queries and transactions.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Selects editable profile fields for an active applicant.
   *
   * @param uuid - Identifier of the applicant to look up.
   * @returns The selected fields, or null if the applicant is unavailable.
   */
  findActiveProfile(uuid: string): Promise<ApplicantProfile | null> {
    return this.prisma.applicant.findUnique({
      where: { uuid, isActive: true },
      select: profileFields,
    });
  }

  /**
   * Updates the profile and writes its audit entry in one transaction.
   *
   * @param uuid - Identifier of the active applicant.
   * @param type - Existing applicant type required for the update.
   * @param data - Validated profile fields to persist.
   * @returns The saved profile fields.
   */
  updateActiveProfile(
    uuid: string,
    type: Applicant['type'],
    data: Pick<Applicant, 'name' | 'email' | 'phoneNumber' | 'cvrNumber'>,
  ): Promise<ApplicantProfile> {
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.applicant.update({
        where: { uuid, type, isActive: true },
        data,
        select: profileFields,
      });
      await tx.auditLog.create({
        data: {
          action: 'applicant.updated',
          actorApplicantId: uuid,
          targetApplicantId: uuid,
          details: {
            actorSource: 'developmentProfile',
            applicantName: profile.name,
            type: profile.type,
          },
        },
      });
      return profile;
    });
  }

  /**
   * Saves a new applicant and writes its audit entry in one transaction.
   * Matching addresses are reused when they are not linked to a municipality.
   * @param data - Validated applicant fields and normalized address.
   * @returns The created applicant.
   */
  async createApplicant(data: CreateApplicantDto): Promise<Applicant> {
    const address = {
      street: data.street,
      houseNumber: data.houseNumber,
      postalCode: data.postalCode,
      city: data.city,
    };

    return this.prisma.$transaction(
      async (tx) => {
        // Serialize lookups and writes for the same address until commit.
        const key = JSON.stringify(
          Object.values(address).map((part) => part.toLowerCase()),
        );
        await tx.$queryRaw`
        SELECT 1 AS locked
        FROM pg_advisory_xact_lock(hashtextextended(${key}, 0))
      `;

        const existing = await tx.address.findFirst({
          where: {
            street: { equals: address.street, mode: 'insensitive' },
            houseNumber: { equals: address.houseNumber, mode: 'insensitive' },
            postalCode: address.postalCode,
            city: { equals: address.city, mode: 'insensitive' },
            municipality: null,
          },
          orderBy: { uuid: 'asc' },
          select: { uuid: true },
        });

        const applicant = await tx.applicant.create({
          data: {
            name: data.name,
            type: data.type === 'private' ? 'Private' : 'Business',
            phoneNumber: data.phoneNumber,
            email: data.email,
            cvrNumber:
              data.type === 'business' ? (data.cvrNumber ?? null) : null,
            mitIdKey: null,
            address: existing ? { connect: existing } : { create: address },
          },
        });
        await tx.auditLog.create({
          data: {
            action: 'applicant.created',
            targetApplicantId: applicant.uuid,
            details: { applicantName: applicant.name, type: applicant.type },
          },
        });
        return applicant;
      },
      { isolationLevel: 'ReadCommitted' },
    );
  }
}
