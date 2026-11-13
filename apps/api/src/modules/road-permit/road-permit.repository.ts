import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service.js';
import { UpdateRoadPermitDto } from './dto/update-road-permit.dto.js';
import type { CreateRoadPermitData } from './mappers/road-permit.mapper.js';

@Injectable()
export class RoadPermitRepository {
  /** Receives the Prisma client that runs road-permit transactions. */
  constructor(private readonly prisma: PrismaService) {}

  /** Creates the application and links its permit by case number in one transaction. */
  async create(data: CreateRoadPermitData) {
    return this.prisma.$transaction(async (prisma) => {
      const { roadUsePermit, ...applicationData } = data;
      const application = await prisma.application.create({
        data: applicationData,
      });
      const permit = await prisma.roadUsePermit.create({
        data: {
          ...roadUsePermit.create,
          applicationId: application.caseNumber,
          application: { connect: { caseNumber: application.caseNumber } },
        },
      });

      return { ...application, roadUsePermit: permit };
    });
  }

  /** Returns placeholder text for the road-permit list. */
  findAll() {
    return 'This action returns all roadPermit';
  }

  /** Returns placeholder text for a lookup by permit ID. */
  findOne(id: number) {
    return `This action returns a #${id} roadPermit`;
  }

  /** Returns placeholder text for an update by permit ID. */
  update(id: number, _updateRoadPermitDto: UpdateRoadPermitDto) {
    return `This action updates a #${id} roadPermit`;
  }

  /** Returns placeholder text for removal by permit ID. */
  remove(id: number) {
    return `This action removes a #${id} roadPermit`;
  }
}
