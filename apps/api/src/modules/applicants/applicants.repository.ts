import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateApplicantDto } from './dto/create-applicant.dto.js';

@Injectable()
export class ApplicantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createApplicant(data: CreateApplicantDto) {
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
