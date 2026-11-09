import { Injectable } from '@nestjs/common';
import { Application, Area, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AreaWithRelations } from './mappers/area.mapper.js';

const areaInclude = { areaDetail: true, areaSize: true } as const;

export type AreaWithApplication = AreaWithRelations & {
  application: Application;
};

export type AreaApplication = Pick<
  Application,
  'caseNumber' | 'type' | 'status'
>;

@Injectable()
export class AreasRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Creates all areas in one transaction, so either all or none are saved. */
  async addMany(areas: Prisma.AreaCreateInput[]): Promise<AreaWithRelations[]> {
    return await this.prisma.$transaction(
      areas.map((area) =>
        this.prisma.area.create({ data: area, include: areaInclude }),
      ),
    );
  }

  async getAllByApplication(
    applicationId: string,
  ): Promise<AreaWithRelations[]> {
    return await this.prisma.area.findMany({
      where: { applicationId },
      include: areaInclude,
      orderBy: { uuid: 'asc' },
    });
  }

  async getById(uuid: string): Promise<AreaWithApplication> {
    return await this.prisma.area.findUniqueOrThrow({
      where: { uuid },
      include: { ...areaInclude, application: true },
    });
  }

  async countByApplication(applicationId: string): Promise<number> {
    return await this.prisma.area.count({ where: { applicationId } });
  }

  async update(
    uuid: string,
    updatedArea: Prisma.AreaUpdateInput,
  ): Promise<AreaWithRelations> {
    return await this.prisma.area.update({
      where: { uuid },
      data: updatedArea,
      include: areaInclude,
    });
  }

  /** Deletes the area together with its detail and size records. */
  async delete(uuid: string): Promise<Area> {
    return await this.prisma.$transaction(async (tx) => {
      // The area holds the foreign keys, so it is deleted first.
      const area = await tx.area.delete({ where: { uuid } });
      if (area.areaDetailId) {
        await tx.areaDetail.delete({ where: { uuid: area.areaDetailId } });
      }
      if (area.areaSizeId) {
        await tx.areaSize.delete({ where: { uuid: area.areaSizeId } });
      }
      return area;
    });
  }

  async getApplication(caseNumber: string): Promise<AreaApplication> {
    return await this.prisma.application.findUniqueOrThrow({
      where: { caseNumber },
      select: { caseNumber: true, type: true, status: true },
    });
  }
}
