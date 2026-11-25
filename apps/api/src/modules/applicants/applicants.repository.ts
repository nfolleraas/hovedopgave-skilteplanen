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
  constructor(private readonly prisma: PrismaService) {}

  findActiveProfile(uuid: string): Promise<ApplicantProfile | null> {
    return this.prisma.applicant.findUnique({
      where: { uuid, isActive: true },
      select: profileFields,
    });
  }

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
   * Reuses a matching address that is not owned by an editable municipality.
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
