import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMunicipalityDto } from './dto/create-municipality.dto.js';
import { UpdateMunicipalityDto } from './dto/update-municipality.dto.js';

@Injectable()
export class MunicipalitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: number) {
    return this.prisma.municipality.findUnique({
      where: { id },
      include: { address: true },
    });
  }

  create(data: CreateMunicipalityDto) {
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

  update(id: number, data: UpdateMunicipalityDto) {
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
