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

@Injectable()
export class ApplicantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveProfile(uuid: string) {
    return this.prisma.applicant.findUnique({
      where: { uuid, isActive: true },
      select: profileFields,
    });
  }

  updateActiveProfile(
    uuid: string,
    type: Applicant['type'],
    data: Pick<Applicant, 'name' | 'email' | 'phoneNumber' | 'cvrNumber'>,
  ) {
    return this.prisma.applicant.update({
      where: { uuid, type, isActive: true },
      data,
      select: profileFields,
    });
  }

  /**
   * Persists a new applicant and its nested address via Prisma.
   */
  async createApplicant(data: CreateApplicantDto): Promise<Applicant> {
    return this.prisma.applicant.create({
      data: {
        name: data.name,
        type: data.type === 'private' ? 'Private' : 'Business',
        phoneNumber: data.phoneNumber,
        email: data.email,
        cvrNumber: data.type === 'business' ? (data.cvrNumber ?? null) : null,
        mitIdKey: null,
        address: {
          create: {
            street: data.street,
            houseNumber: data.houseNumber,
            postalCode: data.postalCode,
            city: data.city,
          },
        },
      },
    });
  }
}
