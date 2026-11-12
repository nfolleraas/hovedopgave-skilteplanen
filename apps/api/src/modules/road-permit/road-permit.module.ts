import { Module } from '@nestjs/common';
import { RoadPermitController } from './road-permit.controller.js';
import { RoadPermitRepository } from './road-permit.repository.js';
import { RoadPermitService } from './road-permit.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [RoadPermitController],
  providers: [RoadPermitRepository, RoadPermitService],
})
export class RoadPermitModule {}
