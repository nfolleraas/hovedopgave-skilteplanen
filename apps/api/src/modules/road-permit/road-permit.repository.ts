import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma.service.js';
import { UpdateRoadPermitDto } from './dto/update-road-permit.dto.js';

@Injectable()
export class RoadPermitRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ApplicationCreateInput) {
    return this.prisma.application.create({
      data,
      include: { roadUsePermit: true },
    });
  }

  findAll() {
    return 'This action returns all roadPermit';
  }

  findOne(id: number) {
    return `This action returns a #${id} roadPermit`;
  }

  update(id: number, _updateRoadPermitDto: UpdateRoadPermitDto) {
    return `This action updates a #${id} roadPermit`;
  }

  remove(id: number) {
    return `This action removes a #${id} roadPermit`;
  }
}
