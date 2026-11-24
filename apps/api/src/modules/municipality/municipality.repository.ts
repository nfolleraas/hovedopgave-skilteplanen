import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';

@Injectable()
export class MunicipalityRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Reads the IDs and names of configured municipalities. */
  findAll() {
    return this.prisma.municipality.findMany({
      select: { id: true, name: true },
    });
  }

  async exists(name: string) {
    return (await this.prisma.municipality.count({ where: { name } })) > 0;
  }
}
