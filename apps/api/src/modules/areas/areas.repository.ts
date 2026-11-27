import { Injectable } from '@nestjs/common';
import { Application, Area, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
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
  /**
   * Creates the repository for area data access.
   * @param prisma - Prisma client used for database queries
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates all areas in one transaction, so either all or none are saved.
   * @param areas - The areas to create
   * @returns The created areas with their detail and size records
   */
  async addMany(areas: Prisma.AreaCreateInput[]): Promise<AreaWithRelations[]> {
    return await this.prisma.$transaction(
      areas.map((area) =>
        this.prisma.area.create({ data: area, include: areaInclude }),
      ),
    );
  }

  /**
   * Gets all areas for an application, ordered by ID.
   * @param applicationId - The case number of the application
   * @returns The areas with their detail and size records
   */
  async getAllByApplication(
    applicationId: string,
  ): Promise<AreaWithRelations[]> {
    return await this.prisma.area.findMany({
      where: { applicationId },
      include: areaInclude,
      orderBy: { uuid: 'asc' },
    });
  }

  /**
   * Gets one area with its detail, size and application.
   * Throws Prisma's not-found error if the area does not exist.
   * @param uuid - The ID of the area
   * @returns The area with its relations
   */
  async getById(uuid: string): Promise<AreaWithApplication> {
    return await this.prisma.area.findUniqueOrThrow({
      where: { uuid },
      include: { ...areaInclude, application: true },
    });
  }

  /**
   * Counts the areas that belong to an application.
   * @param applicationId - The case number of the application
   * @returns The number of areas
   */
  async countByApplication(applicationId: string): Promise<number> {
    return await this.prisma.area.count({ where: { applicationId } });
  }

  /**
   * Updates an area.
   * @param uuid - The ID of the area
   * @param updatedArea - The fields to change
   * @returns The updated area with its detail and size records
   */
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

  /**
   * Deletes the area together with its detail and size records.
   * @param uuid - The ID of the area
   * @returns The deleted area
   */
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

  /**
   * Gets the application fields that decide how areas may be changed.
   * Throws Prisma's not-found error if the application does not exist.
   * @param caseNumber - The case number of the application
   * @returns The case number, type and status of the application
   */
  async getApplication(caseNumber: string): Promise<AreaApplication> {
    return await this.prisma.application.findUniqueOrThrow({
      where: { caseNumber },
      select: { caseNumber: true, type: true, status: true },
    });
  }
}
