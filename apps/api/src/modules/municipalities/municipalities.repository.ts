import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMunicipalityDto } from './dto/create-municipality.dto.js';
import { UpdateMunicipalityDto } from './dto/update-municipality.dto.js';

export type MunicipalityWithAddress = Prisma.MunicipalityGetPayload<{
  include: { address: true };
}>;

@Injectable()
export class MunicipalitiesRepository {
  /**
   * Uses the shared Prisma service that manages the database connection.
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Looks up a municipality and includes its address.
   *
   * @returns The municipality, or null when the ID does not exist.
   */
  findById(id: number): Promise<MunicipalityWithAddress | null> {
    return this.prisma.municipality.findUnique({
      where: { id },
      include: { address: true },
    });
  }

  /**
   * Creates the municipality and a new address in one database operation.
   * Returns the municipality with its associated address.
   */
  create(data: CreateMunicipalityDto): Promise<MunicipalityWithAddress> {
    return this.prisma.municipality.create({
      data: {
        name: data.name,
        region: data.region,
        email: data.email,
        phoneNumber: data.phoneNumber,
        address: {
          create: {
            street: data.address.street,
            houseNumber: data.address.houseNumber,
            postalCode: data.address.postalCode,
            city: data.address.city,
          },
        },
      },
      include: { address: true },
    });
  }

  /**
   * Updates the email address, phone number, and associated address. Only
   * fields allowed in a municipality update are passed to Prisma.
   */
  update(
    id: number,
    data: UpdateMunicipalityDto,
  ): Promise<MunicipalityWithAddress> {
    return this.prisma.municipality.update({
      where: { id },
      data: {
        email: data.email,
        phoneNumber: data.phoneNumber,
        address: {
          update: {
            street: data.address.street,
            houseNumber: data.address.houseNumber,
            postalCode: data.address.postalCode,
            city: data.address.city,
          },
        },
      },
      include: { address: true },
    });
  }
}
