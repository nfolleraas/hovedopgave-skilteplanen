import { Module } from '@nestjs/common';
import { MunicipalityModule } from '../municipality/municipality.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RoadPermitController } from './road-permit.controller.js';
import { RoadPermitRepository } from './road-permit.repository.js';
import { RoadPermitService } from './road-permit.service.js';

@Module({
  imports: [PrismaModule, MunicipalityModule],
  controllers: [RoadPermitController],
  providers: [RoadPermitRepository, RoadPermitService],
})
export class RoadPermitModule {}
