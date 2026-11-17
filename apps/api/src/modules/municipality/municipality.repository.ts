import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';

@Injectable()
export class MunicipalityRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Reads the IDs and names from the municipality lookup table. */
  findAll() {
    return this.prisma.municipalityLookup.findMany({
      select: { id: true, name: true },
    });
  }

  async exists(name: string) {
    return (
      (await this.prisma.municipalityLookup.count({ where: { name } })) > 0
    );
  }
}
