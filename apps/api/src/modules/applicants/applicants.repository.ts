import { Injectable } from '@nestjs/common';
import type { Applicant } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateApplicantDto } from './dto/create-applicant.dto.js';

@Injectable()
export class ApplicantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createApplicant(data: CreateApplicantDto): Promise<Applicant> {
    return this.prisma.applicant.create({
      data: {
        name: data.name,
        type: data.type === 'private' ? 'Private' : 'Business',
        phoneNumber: data.phoneNumber,
        email: data.email,
        cvrNumber: data.cvrNumber ?? null,
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
